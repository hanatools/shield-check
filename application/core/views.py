import base64
import os
import uuid
import face_recognition
from flask import render_template, request, Blueprint, Response, url_for

from application import db, send_email, app
from application.models import BlogPost, User, CheckIn, RelativeCheckIn
from flask_login import login_required, current_user
import threading

from application.users.forms import SoldierRegistrationForm, InputPersonalForm

core = Blueprint("core", __name__)
qr_data_store = threading.Lock()
qr_data = {}


@core.route("/")
@login_required
def index():
    """
    This is the home page view. Notice how it uses pagination to show a limited
    number of posts by limiting its query size and then calling paginate.
    """
    # page = request.args.get("page", 1, type=int)
    # blog_posts = BlogPost.query.order_by(BlogPost.date.desc()).paginate(
    #     page=page, per_page=10
    # )
    return render_template("daskboard.html")


@core.route("/daskboard")
@login_required
def daskboard():
    return render_template("daskboard.html", username=current_user.username)


@core.route("/input_personal")
@login_required
def input_personal():
    form = InputPersonalForm()
    return render_template("input_personal.html", username=current_user.username, form=form)


@core.route("/batch_input")
# @login_required
def batch_input():
    return render_template("batch_input.html", username=current_user.username)


@core.route("/register_relative")
# @login_required
def register_relative():
    return render_template("register_relative.html", username=current_user.username)

@core.route("/reports", methods=["GET", "POST"])
@login_required
def reports():
    from_date = request.args.get("from_date")
    to_date = request.args.get("to_date")

    # Base query
    query = CheckIn.query

    # Apply filters if present
    if from_date:
        query = query.filter(CheckIn.created_time >= from_date)
    if to_date:
        query = query.filter(CheckIn.created_time <= to_date)

    # Order by created_time descending
    check_ins = query.order_by(CheckIn.created_time.desc()).all()

    # Prepare data for rendering
    report_data = []
    for record in check_ins:
        # Calculate duration
        if record.check_in_time and record.check_out_time:
            duration = abs((record.check_out_time - record.check_in_time).total_seconds())
            duration_str = f"{int(duration // 3600)}:{int((duration % 3600) // 60)}:{int(duration % 60)}"
        else:
            duration_str = "N/A"

        report_data.append({
            "id": record.id,
            "full_name": record.full_name,
            "status": record.status,
            "identity_card": record.identity_card,
            "check_in_time": record.check_in_time.strftime("%H:%M:%S %d/%m/%Y") if record.check_in_time else "N/A",
            "check_out_time": record.check_out_time.strftime("%H:%M:%S %d/%m/%Y") if record.check_out_time else "N/A",
            "accepted_datetime": record.accepted_datetime.strftime("%H:%M:%S %d/%m/%Y") if record.accepted_datetime else "N/A",
            "created_time": record.created_time.strftime("%H:%M:%S %d/%m/%Y"),
            "duration": duration_str,
        })

    return render_template("reports.html", username=current_user.username, report_data=report_data)


@core.route("/info")
def info():
    """
    Example view of any other "core" page. Such as a info page, about page,
    contact page. Any page that doesn't really sync with one of the models.
    """
    return render_template("info.html")


def get_user_id():
    """
    Safely get the user ID for storing data, or use "anonymous" for unauthenticated users.
    """
    if hasattr(current_user, "is_authenticated") and current_user.is_authenticated:
        return current_user.id
    return "anonymous"


def generate_frames():
    cap = cv2.VideoCapture(0)  # Access the webcam

    while True:
        success, frame = cap.read()
        if not success:
            break

        # Detect and decode QR code using pyzbar
        qr_codes = decode(frame)

        for qr_code in qr_codes:
            qr_code_data = qr_code.data.decode("utf-8")
            valid_data = extract_identity_card_data(qr_code_data)

            # Use thread-safe storage to save QR data
            user_id = get_user_id()
            with qr_data_store:
                qr_data[user_id] = valid_data if valid_data else "Invalid QR Code"

            # Draw bounding box
            points = qr_code.polygon
            if len(points) > 4:
                points = cv2.convexHull(
                    np.array([point for point in points], dtype=np.float32)
                )

            if points:
                for i in range(len(points)):
                    pt1 = tuple(points[i])
                    pt2 = tuple(points[(i + 1) % len(points)])
                    cv2.line(frame, pt1, pt2, (0, 255, 0), 3)

            # Display the valid QR code data on the frame
            rect = qr_code.rect
            cv2.putText(
                frame,
                valid_data or "Invalid QR Code",
                (rect.left, rect.top - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 0, 0),
                2,
            )

        # Encode the frame to send it to the browser
        _, buffer = cv2.imencode(".jpg", frame)
        frame = buffer.tobytes()
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n")

    cap.release()


@core.route("/get_qr_data", methods=["GET"])
def get_qr_data():
    # Safely retrieve the processed QR data
    user_id = get_user_id()
    print(f"User ID: {user_id}")
    print(f"qr_data: {qr_data}")
    with qr_data_store:
        decoded_text = qr_data.get(user_id, "No Data")
    return jsonify({"decoded_text": decoded_text})


def extract_identity_card_data(qr_code_data):
    """
    Validate and parse identity card data from the QR code.
    Format: 015098011100|171913387|Name|DOB|Gender|Address|IssueDate
    """
    parts = qr_code_data.split("|")
    print("qr_code_data: ", qr_code_data)
    if len(parts) < 1:
        return None

    first_string = parts[0]
    print(f"First string: {first_string}")
    # Check if the first string is 12 characters long
    print(f"Length: {len(first_string)}")
    if len(first_string) == 12:
        return first_string  # Return the valid part
    return None


@core.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame"
    )


from flask import request, jsonify
import cv2
import numpy as np
from pyzbar.pyzbar import decode


@core.route("/decode_qr_code", methods=["POST"])
def decode_qr_code():
    if "image" not in request.files:
        return jsonify({"success": False, "message": "No image provided"})

    # Read the image from the request
    file = request.files["image"]
    np_img = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

    # Decode QR codes
    qr_codes = decode(img)
    if not qr_codes:
        return jsonify({"success": False, "message": "No QR Code detected"})

    # Extract data from the first QR code found
    qr_data = qr_codes[0].data.decode("utf-8")
    return jsonify({"success": True, "data": qr_data})

@core.route("/validate_identity_card", methods=["POST"])
def validate_identity_card():
    data = request.json
    full_name = data.get("full_name", "").strip()
    management_level = data.get("management_level", "").strip()
    unit_name = data.get("unit_name", "").strip()

    if not full_name or not management_level or not unit_name:
        return jsonify({"error": "Họ và tên, Cấp quản lý và Đơn vị không được để trống."}), 400

    # Check if the user exists
    user = User.query.filter_by(full_name=full_name, management_level=management_level, unit_name=unit_name).first()
    if user:
        user_data = {
            "id": user.id,
            "full_name": user.full_name,
            "identity_card": user.identity_card,
            "management_level": user.management_level,
            "unit_name": user.unit_name,
            "email": user.email,
            # "profile_image": url_for("static", filename=f"profile_pics/{user.profile_image}", _external=True),
        }
        return jsonify({"user": user_data, "message": "Người dùng đã tồn tại."}), 200
    else:
        return jsonify({"message": "Không tìm thấy người dùng.", "user": None}), 404


@core.route("/register_soldier", methods=["GET", "POST"])
def register_soldier():
    form = SoldierRegistrationForm()
    return render_template("register_soldier.html", form=form, username=current_user.username)


@core.route("/register_soldier_checkin_data", methods=["POST"])
def register_soldier_checkin_data():
    try:
        # Extract user details from the request
        data = request.json
        full_name = data.get("full_name", "").strip()
        identity_card = data.get("identity_card", "").strip()
        management_level = data.get("management_level", "").strip()
        unit_name = data.get("unit_name", "").strip()
        file_scan = data.get("file_scan", "")
        images = data.get("images", {})

        # Validate required fields
        if not all([full_name, identity_card, management_level, unit_name]):
            return jsonify({"error": "All fields are required"}), 400

        if not all(k in images for k in ['left', 'right', 'front']):
            return jsonify({"error": "Missing one or more required images"}), 400

        # Check if the user exists by identity card
        user = User.query.filter_by(identity_card=identity_card).first()
        if not user:
            return jsonify({"error": f"User with identity card {identity_card} does not exist"}), 404

            # Validate user image and identity card
        is_valid, validation_message = validate_user_image(images, user)
        print(f"Validation message: {validation_message}")
        if not is_valid:
            return jsonify({"error": validation_message}), 400

        # Prepare and send approval email
        token=str(uuid.uuid4())
        approval_url = f"{app.config.get('WEB_HOST_URL')}/approve/{user.id}/check-out/{token}"  # Example approval URL
        email_body = f"""
        Dear Admin,

        A new user has submitted their details for approval:

        Full Name: {user.full_name}
        Identity Card: {user.identity_card}
        Management Level: {user.management_level}
        Unit Name: {user.unit_name}

        Please review and approve the submission here:
        {approval_url}

        Best regards,
        HRM System
        """
        email_sent = send_email("Approval Request for New User", app.config.get('MAIL_DEFAULT_RECEIVER'), email_body)

        if not email_sent:
            return jsonify({"error": "Data saved but failed to send approval email"}), 500

        # Save images to disk
        check_in_folder = os.path.join("static", "check-in")
        os.makedirs(check_in_folder, exist_ok=True)

        image_paths = {}
        for key, base64_image in images.items():
            file_path = os.path.join(check_in_folder, f"check_in_{key}_{uuid.uuid4().hex}.png")
            with open(file_path, "wb") as image_file:
                image_file.write(base64.b64decode(base64_image.split(",")[1]))
            image_paths[key] = file_path

        # Save file scan if provided
        file_scan_path = None
        if file_scan:
            file_scan_path = os.path.join(check_in_folder, f"check_in_file_scan_{uuid.uuid4().hex}.pdf")
            with open(file_scan_path, "wb") as file:
                file.write(base64.b64decode(file_scan.split(",")[1]))

        # Create a new CheckIn record
        check_in_record = CheckIn(
            user_id=user.id,
            full_name=full_name,
            identity_card=identity_card,
            management_level=management_level,
            unit_name=unit_name,
            file_scan_path=file_scan_path,
            left_image_path=image_paths.get("left"),
            right_image_path=image_paths.get("right"),
            front_image_path=image_paths.get("front"),
            token=token,
        )

        # Save to the database
        db.session.add(check_in_record)
        db.session.commit()

        # Return success response with details
        return jsonify({
            "message": "Check-in data saved successfully!",
            "check_in": {
                "id": check_in_record.id,
                "full_name": check_in_record.full_name,
                "identity_card": check_in_record.identity_card,
                "management_level": check_in_record.management_level,
                "unit_name": check_in_record.unit_name,
                "status": check_in_record.status,
                "token": check_in_record.token,
                "created_time": check_in_record.created_time.isoformat(),
            },
        }), 200

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

def validate_user_image(base64_images, user):
    temp_folder = os.path.join("static", "temp")
    os.makedirs(temp_folder, exist_ok=True)
    temp_images = {}

    try:
        # Save temporary images
        for key, base64_image in base64_images.items():
            temp_image_path = os.path.join(temp_folder, f"{key}_{uuid.uuid4().hex}.png")
            with open(temp_image_path, "wb") as temp_image_file:
                temp_image_file.write(base64.b64decode(base64_image.split(",")[1]))
            temp_images[key] = temp_image_path

        # Validate the front image
        front_image_path = temp_images.get("front")
        if not front_image_path:
            return False, "Front image is required for validation."

        front_image = face_recognition.load_image_file(front_image_path)
        front_face_encodings = face_recognition.face_encodings(front_image)

        if len(front_face_encodings) == 0:
            return False, "No face detected in the front image."

        front_encoding = front_face_encodings[0]
        known_encoding_path = user.encoding_path

        if not known_encoding_path or not os.path.exists(known_encoding_path):
            return False, "No stored face encoding found for this user."

        known_encoding = np.load(known_encoding_path)
        is_face_match = face_recognition.compare_faces([known_encoding], front_encoding)[0]

        if not is_face_match:
            return False, "Face does not match the registered user."

        # Verify identity card number
        stored_identity_card = os.path.basename(known_encoding_path).split(".")[0]  # Extract ID from filename
        if stored_identity_card != user.identity_card:
            return False, f"Identity card mismatch: expected {user.identity_card}, found {stored_identity_card}."

        return True, "Face and identity card validated successfully."

    finally:
        # Cleanup temporary files
        for temp_image_path in temp_images.values():
            if os.path.exists(temp_image_path):
                os.remove(temp_image_path)

@core.route("/relative_reports", methods=["GET", "POST"])
@login_required
def relative_reports():
    from_date = request.args.get("from_date")
    to_date = request.args.get("to_date")

    # Base query
    query = RelativeCheckIn.query.filter(RelativeCheckIn.soldier_user_id.isnot(None))  # Ensure we fetch records linked to users

    # Apply filters
    if from_date:
        query = query.filter(RelativeCheckIn.created_time >= from_date)
    if to_date:
        query = query.filter(RelativeCheckIn.created_time <= to_date)

    # Order by created_time descending
    check_ins = query.order_by(RelativeCheckIn.created_time.desc()).all()

    # Prepare data for rendering
    report_data = []
    for record in check_ins:
        # Fetch related user data
        related_user = User.query.get(record.soldier_user_id)
        if related_user:
            # Calculate duration
            if record.check_in_time and record.check_out_time:
                duration = abs((record.check_out_time - record.check_in_time).total_seconds())
                duration_str = f"{int(duration // 3600)}:{int((duration % 3600) // 60)}:{int(duration % 60)}"
            else:
                duration_str = "N/A"

            report_data.append({
                "full_name": related_user.full_name if related_user else "N/A",
                "identity_card": record.identity_card,
                "soldier_identity_card": related_user.identity_card if related_user else "N/A",
                "soldier_name": related_user.full_name if related_user else "N/A",
                "management_level": related_user.management_level if related_user else "N/A",
                "unit_name": related_user.unit_name if related_user else "N/A",
                "check_in_time": record.check_in_time.strftime("%H:%M:%S %d/%m/%Y") if record.check_in_time else "N/A",
                "check_out_time": record.check_out_time.strftime("%H:%M:%S %d/%m/%Y") if record.check_out_time else "N/A",
                "duration": duration_str,
            })

    return render_template("relative_reports.html", username=current_user.username, report_data=report_data)