import base64
import json
import os
import uuid
from datetime import datetime
from flask_wtf.csrf import generate_csrf
import face_recognition
from flask import (
    render_template,
    Blueprint,
    Response,
    url_for,
    flash,
    redirect,
    session,
    current_app,
)
from werkzeug.security import generate_password_hash
import requests
from application import db, send_email, app
from application.email import generate_html_email, generate_reset_second_password_email
from application.models import (
    User,
    SponsorCheckIn,
    RelativeCheckIn,
    MilitaryUnit,
)
from flask_login import login_required, current_user
import threading
import socket
from application.users.forms import (
    SoldierRegistrationForm,
    InputPersonalForm,
    RegisterRelativeForm,
)

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


@core.route("/daskboard", methods=["GET"])
@login_required
def daskboard():
    csrf_token_value = generate_csrf()  # Rename to avoid conflict
    return render_template(
        "daskboard.html",
        username=current_user.username,
        csrf_token_value=csrf_token_value,
    )


@core.route("/api/scan-identity", methods=["POST"])
def scan_identity():
    try:
        data = request.json
        image_base64 = data.get("image")

        if not image_base64:
            return jsonify({"error": "No image provided"}), 400

        # Decode and save the image
        temp_image_path = os.path.join("static", "temp", f"{uuid.uuid4().hex}.png")
        os.makedirs(os.path.dirname(temp_image_path), exist_ok=True)
        with open(temp_image_path, "wb") as f:
            f.write(base64.b64decode(image_base64.split(",")[1]))

        # Perform OCR to extract identity number
        identity_number = perform_ocr(temp_image_path)  # Your OCR function here

        if not identity_number:
            return jsonify({"error": "Không nhận diện được số CCCD"}), 400

        return jsonify({"identity_card": identity_number}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@core.route("/api/check-in/<identity_card>", methods=["GET"])
@login_required
def get_latest_check_in(identity_card):
    try:
        print(f"Identity card: {identity_card}")

        # Check in SponsorCheckIn first
        check_in = (
            SponsorCheckIn.query.filter_by(
                identity_card=identity_card, status="accepted"
            )
            .order_by(SponsorCheckIn.created_time.desc())
            .first()
        )

        if check_in:
            # Parse acceptors JSON from the record
            acceptors = json.loads(check_in.acceptors or "[]")

            # Prepare acceptor statuses dynamically
            acceptor_statuses = [
                {
                    "level": index + 1,
                    "name": acceptor.get(
                        f"acceptor-level-{index + 1}-manager_id-manager_full_name",
                        "N/A",
                    ),
                    "status": acceptor.get("status", "Chờ duyệt"),
                    "label": STATUS_TRANSLATIONS.get(
                        acceptor.get("status", "created"), "Không xác định"
                    ),
                }
                for index, acceptor in enumerate(acceptors)
            ]

            return jsonify(
                {
                    "type": "sponsor",
                    "id": check_in.id,
                    "full_name": check_in.full_name,
                    "identity_card": check_in.identity_card,
                    "unit_name": check_in.military_unit_name or "N/A",
                    "management_level": check_in.military_manager_full_name or "N/A",
                    "created_time": (
                        check_in.created_time.isoformat()
                        if check_in.created_time
                        else None
                    ),
                    "check_out_time": (
                        check_in.check_out_time.isoformat()
                        if check_in.check_out_time
                        else None
                    ),
                    "accepted_datetime": (
                        check_in.accepted_datetime.isoformat()
                        if check_in.accepted_datetime
                        else None
                    ),
                    "status": check_in.status,
                    "acceptor_statuses": acceptor_statuses,
                }
            )

        # If no SponsorCheckIn is found, check RelativeCheckIn
        relative_check_in = (
            RelativeCheckIn.query.filter_by(
                identity_card=identity_card, status="accepted"
            )
            .order_by(RelativeCheckIn.created_time.desc())
            .first()
        )

        if relative_check_in:
            return jsonify(
                {
                    "type": "relative",
                    "id": relative_check_in.id,
                    "full_name": relative_check_in.full_name,
                    "identity_card": relative_check_in.identity_card,
                    "relationship": relative_check_in.relationship or "N/A",
                    "unit_name": relative_check_in.unit_name or "N/A",
                    "created_time": (
                        relative_check_in.created_time.isoformat()
                        if relative_check_in.created_time
                        else None
                    ),
                    "check_out_time": (
                        relative_check_in.check_out_time.isoformat()
                        if relative_check_in.check_out_time
                        else None
                    ),
                    "status": relative_check_in.status,
                }
            )

        # If neither SponsorCheckIn nor RelativeCheckIn is found
        return (
            jsonify({"error": "Không tìm thấy thông tin check-in đã được phê duyệt"}),
            404,
        )
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@core.route("/input_personal")
@login_required
def input_personal():
    form = InputPersonalForm()
    return render_template(
        "input_personal.html", username=current_user.username, form=form
    )


@core.route("/batch_input")
@login_required
def batch_input():
    csrf_token_value = generate_csrf()
    return render_template(
        "batch_input.html",
        username=current_user.username,
        csrf_token_value=csrf_token_value,
    )

@core.route("/register_relative", methods=["GET", "POST"])
@login_required
def register_relative():
    form = RegisterRelativeForm()
    if request.method == "POST":
        print(f"request.form: {request.form}")
        # Get form data
        full_name = request.form.get("full_name", "").strip()
        identity_card = request.form.get("identity_card", "").strip()
        relationship = request.form.get("relationship", "").strip()
        sponsor_identity_card = request.form.get("sponsor_identity_card", "").strip()
        sponsor_military_unit_id = request.form.get(
            "sponsor_military_unit_id", ""
        ).strip()
        note = request.form.get("note", "").strip()

        # Validate inputs
        if not full_name or len(identity_card) != 12:
            flash(
                "Đầu vào không hợp lệ: Vui lòng đảm bảo tất cả các trường bắt buộc được điền chính xác.",
                "danger",
            )
            return redirect(url_for("core.register_relative"))

        # Check if a relative with this identity card already exists
        existing_relative = RelativeCheckIn.query.filter_by(identity_card=identity_card).first()
        if existing_relative:
            flash(
                f"Người thân với CCCD {identity_card} đã được đăng ký. Vui lòng kiểm tra lại.",
                "danger",
            )
            return redirect(url_for("core.register_relative"))

        # Check if sponsor exists (should always be true since it's the logged-in user)
        sponsor = User.query.filter_by(identity_card=sponsor_identity_card).first()
        if not sponsor:
            flash(
                "Nhà tài trợ không tồn tại. Vui lòng liên hệ bộ phận hỗ trợ.", "danger"
            )
            return redirect(url_for("core.register_relative"))

        # Initialize sponsor-related fields
        sponsor_military_manager_id = None
        sponsor_military_manager_full_name = None
        sponsor_military_unit_name = None

        # If sponsor_military_unit_id is provided, find the military manager and set the details
        if sponsor_military_unit_id:
            military_unit = MilitaryUnit.query.filter_by(
                id=sponsor_military_unit_id
            ).first()
            if military_unit:
                military_manager = User.query.filter_by(
                    military_unit_id=military_unit.id, is_manager=True
                ).first()
                if military_manager:
                    sponsor_military_manager_id = military_manager.id
                    sponsor_military_manager_full_name = military_manager.full_name
                sponsor_military_unit_name = military_unit.name

        # Add relative to RelativeCheckIn
        new_relative = RelativeCheckIn(
            full_name=full_name,
            identity_card=identity_card,
            relationship=relationship,
            sponsor_identity_card=sponsor_identity_card,
            sponsor_full_name=sponsor.full_name,
            sponsor_military_unit_id=sponsor_military_unit_id or None,
            sponsor_military_unit_name=sponsor_military_unit_name,
            sponsor_military_manager_id=sponsor_military_manager_id,
            sponsor_military_manager_full_name=sponsor_military_manager_full_name,
            note=note,
            created_by=current_user.id,
            status="accepted",
        )
        db.session.add(new_relative)

        # Commit the transaction
        db.session.commit()

        flash("Người thân đã đăng ký và tạo thủ tục check-in thành công.", "success")
        return redirect(url_for("core.daskboard"))

    # Render the registration form
    return render_template(
        "register_relative.html", username=current_user.username, form=form
    )

def add_relative(full_name, identity_card, sponsor_id, relationship, creator_id):
    # Check if sponsor exists
    sponsor = User.query.filter_by(identity_card=sponsor_id).first()
    if not sponsor:
        raise ValueError("Sponsor does not exist.")

    # Check if the creator exists
    creator = User.query.get(creator_id)
    if not creator:
        raise ValueError("Creator does not exist.")

    # Create a new relative record
    new_relative = UserRelative(
        full_name=full_name,
        identity_card=identity_card,
        sponsor_id=sponsor_id,
        relationship=relationship,
        created_by=creator_id,
    )
    db.session.add(new_relative)
    db.session.commit()
    return new_relative


def get_relatives_created_by(user_id):
    return UserRelative.query.filter_by(created_by=user_id).all()


def get_relatives_for_sponsor(sponsor_id):
    return UserRelative.query.filter_by(sponsor_id=sponsor_id).all()

@core.route("/reports", methods=["GET", "POST"])
@login_required
def reports():
    from_date = request.args.get("from_date")
    to_date = request.args.get("to_date")

    # Base query
    query = SponsorCheckIn.query

    # Apply filters if present
    if from_date:
        query = query.filter(SponsorCheckIn.created_time >= from_date)
    if to_date:
        query = query.filter(SponsorCheckIn.created_time <= to_date)

    # Order by created_time descending
    check_ins = query.order_by(SponsorCheckIn.created_time.desc()).all()

    # Prepare data for rendering
    report_data = []
    for record in check_ins:
        # Parse acceptors JSON
        acceptors = json.loads(record.acceptors) if record.acceptors else []

        # Calculate duration
        if record.check_in_time and record.check_out_time:
            duration = abs(
                (record.check_out_time - record.check_in_time).total_seconds()
            )
            duration_str = f"{int(duration // 3600)}:{int((duration % 3600) // 60)}:{int(duration % 60)}"
        else:
            duration_str = "N/A"

        report_data.append(
            {
                "id": record.id,
                "full_name": record.full_name,
                "status": record.status,
                "acceptors": acceptors,
                "identity_card": record.identity_card,
                "check_in_time": (
                    record.check_in_time.strftime("%H:%M:%S %d/%m/%Y")
                    if record.check_in_time
                    else "N/A"
                ),
                "check_out_time": (
                    record.check_out_time.strftime("%H:%M:%S %d/%m/%Y")
                    if record.check_out_time
                    else "N/A"
                ),
                "accepted_datetime": (
                    record.accepted_datetime.strftime("%H:%M:%S %d/%m/%Y")
                    if record.accepted_datetime
                    else "N/A"
                ),
                "created_time": record.created_time.strftime("%H:%M:%S %d/%m/%Y"),
                "duration": duration_str,
            }
        )

    return render_template(
        "reports.html",
        username=current_user.username,
        report_data=report_data,
        STATUS_TRANSLATIONS=STATUS_TRANSLATIONS,
    )


@core.route("/info")
@login_required
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
@login_required
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
        return (
            jsonify({"error": "Họ và tên, Cấp quản lý và Đơn vị không được để trống."}),
            400,
        )

    # Check if the user exists
    user = User.query.filter_by(
        full_name=full_name, management_level=management_level, unit_name=unit_name
    ).first()
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
    # Check internet connection
    try:
        requests.get("http://www.google.com", timeout=5)
    except requests.ConnectionError:
        return render_template(
            "error.html",
            error_message="Không thể kết nối Internet. Vui lòng kiểm tra kết nối mạng của bạn và thử lại.",
        )
    return render_template(
        "register_soldier.html", form=form, username=current_user.username
    )


@core.route("/military_units", methods=["GET"])
@login_required
def military_units():
    csrf_token_value = generate_csrf()
    units = MilitaryUnit.query.order_by(MilitaryUnit.created_date.desc()).all()
    units_with_parents = []

    for unit in units:
        parent_unit = MilitaryUnit.query.get(unit.parent) if unit.parent else None
        units_with_parents.append(
            {
                "id": unit.id,
                "key": unit.key,
                "name": unit.name,
                "note": unit.note,
                "created_date": unit.created_date.strftime("%Y-%m-%d %H:%M:%S"),
                "parent_name": (
                    parent_unit.name if parent_unit else "Không có (Đơn vị gốc)"
                ),
            }
        )

    return render_template(
        "military_units.html",
        units=units_with_parents,
        username=current_user.username,
        csrf_token_value=csrf_token_value,
    )


@core.route("/add_military_unit", methods=["POST"])
@login_required
def add_military_unit():
    name = request.form.get("military_units_name")
    key = request.form.get("military_units_key")
    note = request.form.get("military_units_note")
    parent_id = request.form.get("military_units_parent")  # Get the selected parent ID

    # Validate inputs
    if not name or not key:
        return jsonify(
            {"success": False, "message": "Tên và Khóa không được để trống."}
        )

    # Validate key for spaces or empty values
    if not key.strip() or " " in key:
        return jsonify(
            {
                "success": False,
                "message": "Khóa không được để trống hoặc chứa khoảng trắng.",
            }
        )

    # Check for duplicate key
    existing_unit = MilitaryUnit.query.filter_by(key=key).first()
    if existing_unit:
        return jsonify(
            {
                "success": False,
                "message": f"Khóa '{key}' đã tồn tại. Vui lòng chọn khóa khác.",
            }
        )
    # Find parent unit if provided
    parent_unit = None
    if parent_id:
        parent_unit = MilitaryUnit.query.get(parent_id)
        if not parent_unit:
            return jsonify({"success": False, "message": "Đơn vị cha không tồn tại."})

    # Create the new military unit
    new_unit = MilitaryUnit(
        name=name,
        key=key,
        note=note,
        parent=parent_unit.id if parent_unit else None,
        created_by=current_user.id,
    )
    db.session.add(new_unit)
    db.session.commit()

    return jsonify({"success": True, "message": "Đơn vị mới đã được thêm thành công."})


@core.route("/get_military_unit/<int:unit_id>", methods=["GET"])
@login_required
def get_military_unit(unit_id):
    unit = MilitaryUnit.query.get(unit_id)
    if not unit:
        return jsonify({"success": False, "message": "Đơn vị không tồn tại."})

    # Build response with parent info
    data = {
        "id": unit.id,
        "name": unit.name,
        "key": unit.key,
        "note": unit.note,
        "created_date": unit.created_date.strftime("%Y-%m-%d %H:%M:%S"),
        "parent": unit.parent if unit.parent else None,
    }
    return jsonify({"success": True, "data": data})


@core.route("/edit_military_unit", methods=["POST"])
@login_required
def edit_military_unit():
    unit_id = request.form.get("edit_military_units_id")
    name = request.form.get("edit_military_units_name")
    key = request.form.get("edit_military_units_key")
    note = request.form.get("edit_military_units_note")
    parent_id = request.form.get("edit_military_units_parent")

    # Validate inputs
    if not unit_id or not name or not key:
        return jsonify(
            {"success": False, "message": "ID, Tên và Khóa không được để trống."}
        )
    # Validate key for spaces or empty values
    if not key.strip() or " " in key:
        return jsonify(
            {
                "success": False,
                "message": "Khóa không được để trống hoặc chứa khoảng trắng.",
            }
        )

    # Fetch the military unit to edit
    unit = MilitaryUnit.query.get(unit_id)
    if not unit:
        return jsonify({"success": False, "message": "Đơn vị không tồn tại."})

    # Check for duplicate key (exclude current unit)
    existing_unit = MilitaryUnit.query.filter(
        MilitaryUnit.key == key, MilitaryUnit.id != unit_id
    ).first()
    if existing_unit:
        return jsonify(
            {
                "success": False,
                "message": f"Khóa '{key}' đã tồn tại. Vui lòng chọn khóa khác.",
            }
        )

    # Update the unit details
    unit.name = name
    unit.key = key
    unit.note = note

    # Handle parent update
    if parent_id:
        parent_unit = MilitaryUnit.query.get(parent_id)
        if not parent_unit:
            return jsonify({"success": False, "message": "Đơn vị cha không tồn tại."})
        unit.parent = parent_unit.id
    else:
        unit.parent = None

    db.session.commit()
    return jsonify(
        {"success": True, "message": "Thông tin đơn vị đã được cập nhật thành công."}
    )


@core.route("/delete_military_unit/<int:unit_id>", methods=["DELETE"])
@login_required
def delete_military_unit(unit_id):
    try:
        # Retrieve the unit to delete
        unit = MilitaryUnit.query.get(unit_id)
        if not unit:
            return (
                jsonify(
                    {"success": False, "message": "Không tìm thấy đơn vị quân đội."}
                ),
                404,
            )

        # Check if the unit has children
        child_units = MilitaryUnit.query.filter_by(parent=unit.id).all()
        if child_units:
            return (
                jsonify(
                    {"success": False, "message": "Không thể xóa đơn vị có đơn vị con."}
                ),
                400,
            )

        # Proceed to delete the unit
        db.session.delete(unit)
        db.session.commit()
        return (
            jsonify({"success": True, "message": "Đơn vị quân đội đã xóa thành công."}),
            200,
        )

    except Exception as e:
        return (
            jsonify({"success": False, "message": f"An error occurred: {str(e)}"}),
            500,
        )

def get_public_ip_and_port():
    try:
        # Get the hostname and resolve the IP
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)

        # Assuming Flask server is running on a known port
        port = app.config.get("PORT", 5001)  # Default port is 5001
        return f"http://{local_ip}:{port}"
    except Exception as e:
        print(f"Error getting public IP: {e}")
        return None


@core.route("/register_soldier_checkin_data", methods=["POST"])
@login_required
def register_soldier_checkin_data():

    # Check internet connection
    try:
        requests.get("http://www.google.com", timeout=5)
    except requests.ConnectionError:
        return render_template(
            "error.html",
            error_message="Không thể kết nối Internet. Vui lòng kiểm tra kết nối mạng của bạn và thử lại.",
        )
    try:
        # Extract user details from the request
        data = request.json
        identity_card = data.get("identity_card", "").strip()
        acceptors = data.get("acceptors", [])
        file_scan = data.get("file_scan", "")
        images = data.get("images", {})

        # Validate acceptors JSON
        if len(acceptors) == 0 or len(acceptors) > 4:
            return jsonify({"error": "Người duyệt phải từ 1 đến 4."}), 400

        # Check for duplicate acceptor IDs
        acceptor_ids = [
            acceptor.get(f"acceptor-level-{index + 1}")
            for index, acceptor in enumerate(acceptors)
        ]
        if len(acceptor_ids) != len(set(acceptor_ids)):
            return jsonify({"error": "Không được chọn trùng người duyệt."}), 400

        # Validate identity card
        user = User.query.filter_by(identity_card=identity_card).first()
        if not user:
            return (
                jsonify(
                    {"error": f"Người dùng với CCCD {identity_card} không tồn tại."}
                ),
                404,
            )

        # Validate required images
        if not all(k in images for k in ["left", "right", "front"]):
            return jsonify({"error": "Thiếu một hoặc nhiều ảnh cần thiết."}), 400

        # Process dynamic acceptors
        for index, acceptor in enumerate(acceptors):
            manager_id_key = next(
                (key for key in acceptor if key.endswith("-manager_id")), None
            )
            if manager_id_key:
                manager_id = acceptor.get(manager_id_key)
                if manager_id:
                    manager = User.query.get(manager_id)
                    if manager:
                        print(f"acceptor ID: {acceptor}")
                        acceptor[f"{manager_id_key}-manager_full_name"] = (
                            manager.full_name
                        )
                        acceptor[f"{manager_id_key}-manager_email"] = manager.email
                        if index == 0:
                            acceptor["status"] = "created"
                        else:
                            acceptor["status"] = "pending"
        # Save images to disk
        check_in_folder = os.path.join("static", "check-in")
        os.makedirs(check_in_folder, exist_ok=True)

        image_paths = {}
        for key, base64_image in images.items():
            file_path = os.path.join(
                check_in_folder, f"check_in_{key}_{uuid.uuid4().hex}.png"
            )
            with open(file_path, "wb") as image_file:
                image_file.write(base64.b64decode(base64_image.split(",")[1]))
            image_paths[key] = file_path

        # Get public IP dynamically
        public_url = get_public_ip_and_port()
        if not public_url:
            return render_template(
                "error.html",
                error_message="Không thể lấy địa chỉ máy chủ. Vui lòng kiểm tra cấu hình mạng.",
            )

        # Save file scan if provided
        file_scan_path = None
        if file_scan:
            file_scan_path = os.path.join(
                check_in_folder, f"check_in_file_scan_{uuid.uuid4().hex}.pdf"
            )
            with open(file_scan_path, "wb") as file:
                file.write(base64.b64decode(file_scan.split(",")[1]))
        token = str(uuid.uuid4())
        # Create a new CheckIn record
        check_in_record = SponsorCheckIn(
            user_id=user.id,
            full_name=user.full_name,
            identity_card=identity_card,
            file_scan_path=file_scan_path,
            left_image_path=image_paths.get("left"),
            right_image_path=image_paths.get("right"),
            front_image_path=image_paths.get("front"),
            acceptors=json.dumps(acceptors),
            created_by_id=current_user.id,
            token=token,
        )

        db.session.add(check_in_record)
        db.session.commit()
        # Send email only to the first acceptor

        approvers_list = [
            {
                "email": acceptor.get(
                    f"acceptor-level-{index + 1}-manager_id-manager_email"
                ),
                "name": acceptor.get(
                    f"acceptor-level-{index + 1}-manager_id-manager_full_name", "N/A"
                ),
                "status": STATUS_TRANSLATIONS.get(
                    acceptor.get("status", "Chờ duyệt"), "Chờ duyệt"
                ),
            }
            for index, acceptor in enumerate(acceptors)
        ]

        approval_url = f"{public_url}/approve/{user.id}/check-out/{token}/1"
        subject = "Yêu cầu phê duyệt để ra ngoài"
        body_html = generate_html_email(
            user.full_name,
            user.military_unit.name if user.military_unit else "",
            datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S"),
            approval_url,
            approvers_list,
        )
        send_email(subject, approvers_list[0]["email"], body_html)

        return (
            jsonify(
                {
                    "message": "Check-in data saved successfully!",
                    "check_in": {
                        "id": check_in_record.id,
                        "full_name": check_in_record.full_name,
                        "identity_card": check_in_record.identity_card,
                    },
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


import secrets
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature


@core.route("/send_reset_second_password_email", methods=["POST"])
@login_required
def send_reset_second_password_email():
    user = current_user  # Get the logged-in user
    if not user.email:
        return (
            jsonify(
                {"success": False, "message": "User does not have a registered email."}
            ),
            400,
        )

    # Generate reset link
    serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])
    token = serializer.dumps(user.id, salt="reset-second-password")
    user.reset_second_token = token
    db.session.commit()

    reset_url = url_for("core.reset_second_password", token=token, _external=True)

    # Send email
    subject = "Reset Your Second Password"
    email_content = generate_reset_second_password_email(user.full_name, reset_url)
    send_email(subject, user.email, email_content)

    return jsonify(
        {"success": True, "message": "Reset link has been sent to your email."}
    )


import re


@core.route("/reset_second_password/<token>", methods=["GET", "POST"])
@login_required
def reset_second_password(token):
    try:
        # Decode and validate the token
        serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])
        user_id = serializer.loads(token, salt="reset-second-password", max_age=300)
        user = User.query.get_or_404(user_id)
        if user.reset_second_token is None or user.reset_second_token != token:
            return render_template(
                "reset_error.html",
                error_message="Liên kết đặt lại này không hợp lệ hoặc đã được sử dụng.",
                action_text="Yêu cầu liên kết đặt lại mới",
            )

        csrf_token_value = generate_csrf()

        # Handle POST request for password reset
        if request.method == "POST":
            new_password = request.form.get("new_password", "").strip()

            # Validate password complexity
            if len(new_password) < 8 or not re.match(
                r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$",
                new_password,
            ):
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Password must be at least 8 characters long, "
                            "and include uppercase, lowercase, numbers, and special characters.",
                        }
                    ),
                    400,
                )

            # Update the user's second password and invalidate the token
            user.second_level_password = generate_password_hash(new_password)
            user.reset_second_token = None  # Mark the token as used
            db.session.commit()

            # JSON response for success
            return jsonify(
                {"success": True, "message": "Đã đặt lại mật khẩu thành công."}
            )

        # Render the reset password form
        return render_template(
            "reset_second_password.html",
            user=user,
            token=token,
            csrf_token_value=csrf_token_value,
            loginId=current_user.id,
        )

    except SignatureExpired:
        csrf_token_value = generate_csrf()
        return render_template(
            "reset_error.html",
            csrf_token_value=csrf_token_value,
            error_message="Liên kết đặt lại đã hết hạn.",
            action_link=url_for("core.request_reset_second_password"),
            action_text="Request a new reset link",
        )
    except BadSignature:
        csrf_token_value = generate_csrf()
        return render_template(
            "reset_error.html",
            csrf_token_value=csrf_token_value,
            error_message="Invalid reset link.",
            action_link=url_for("core.request_reset_second_password"),
            action_text="Request a new reset link",
        )

    except SignatureExpired:
        return render_template(
            "reset_error.html",
            error_message="Liên kết đặt lại đã hết hạn. Vui lòng yêu cầu liên kết đặt lại mới.",
        )
    except BadSignature:
        return render_template(
            "reset_error.html",
            error_message="Liên kết đặt lại không hợp lệ. Vui lòng yêu cầu liên kết đặt lại mới.",
        )


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
        is_face_match = face_recognition.compare_faces(
            [known_encoding], front_encoding
        )[0]

        if not is_face_match:
            return False, "Face does not match the registered user."

        # Verify identity card number
        stored_identity_card = os.path.basename(known_encoding_path).split(".")[
            0
        ]  # Extract ID from filename
        if stored_identity_card != user.identity_card:
            return (
                False,
                f"Identity card mismatch: expected {user.identity_card}, found {stored_identity_card}.",
            )

        return True, "Face and identity card validated successfully."

    finally:
        # Cleanup temporary files
        for temp_image_path in temp_images.values():
            if os.path.exists(temp_image_path):
                os.remove(temp_image_path)


@core.route("/military_units/hierarchy", methods=["GET"])
@login_required
def get_hierarchy():
    def build_hierarchy(unit):
        """Recursive function to build the hierarchy."""
        return {
            "name": unit.name,
            "key": unit.key,
            "children": [build_hierarchy(child) for child in unit.sub_units],
        }

    root_units = MilitaryUnit.query.filter_by(parent=None).all()
    hierarchy = [build_hierarchy(unit) for unit in root_units]

    return jsonify(hierarchy)


from sqlalchemy.orm import joinedload


@core.route("/relative_reports", methods=["GET", "POST"])
@login_required
def relative_reports():
    # Base query
    # Retrieve filter inputs from the request
    from_date = request.args.get("from_date")
    to_date = request.args.get("to_date")

    # Base query
    query = RelativeCheckIn.query.options(
        joinedload(RelativeCheckIn.sponsor),
        joinedload(RelativeCheckIn.sponsor_military_unit),
    )

    # Apply date filters if provided
    if from_date:
        query = query.filter(RelativeCheckIn.created_time >= from_date)
    if to_date:
        query = query.filter(RelativeCheckIn.created_time <= to_date)

    # Fetch all records for the report
    check_ins = query.order_by(RelativeCheckIn.created_time.desc()).all()

    # Debug log
    print(f"Report check_ins: {check_ins}")

    report_data = []
    for record in check_ins:
        # Fetch related soldier user by identity card
        soldier_user = User.query.filter_by(
            identity_card=record.sponsor_identity_card
        ).first()

        if record.check_in_time and record.check_out_time:
            duration = abs(
                (record.check_out_time - record.check_in_time).total_seconds()
            )
            duration_str = f"{int(duration // 3600)}:{int((duration % 3600) // 60)}:{int(duration % 60)}"
        else:
            duration_str = "N/A"

        # Prepare report row
        report_data.append(
            {
                "id": record.id,
                "full_name": record.full_name or "N/A",
                "status": record.status or "",
                "identity_card": record.identity_card or "N/A",
                "soldier_identity_card": (
                    soldier_user.identity_card if soldier_user else "N/A"
                ),
                "soldier_name": soldier_user.full_name if soldier_user else "N/A",
                "management_level": (
                    soldier_user.military_manager_full_name
                    if soldier_user and soldier_user.military_manager_full_name
                    else "N/A"
                ),
                "unit_name": (
                    soldier_user.military_unit.name
                    if soldier_user and soldier_user.military_unit
                    else "N/A"
                ),
                "check_in_time": (
                    record.check_in_time.strftime("%H:%M:%S %d/%m/%Y")
                    if record.check_in_time
                    else "N/A"
                ),
                "check_out_time": (
                    record.check_out_time.strftime("%H:%M:%S %d/%m/%Y")
                    if record.check_out_time
                    else "N/A"
                ),
                "duration": duration_str,
                "created_time": (
                    record.created_time.strftime("%H:%M:%S %d/%m/%Y")
                    if record.created_time
                    else "N/A"
                ),
            }
        )

    return render_template(
        "relative_reports.html",
        username=current_user.username,
        report_data=report_data,
    )


STATUS_TRANSLATIONS = {
    "created": "Chờ duyệt",
    "accepted": "Đã duyệt",
    "reject": "Từ chối",
    "cancel": "Đã hủy",
    "expired": "Hết hạn",
    "completed": "Hoàn thành",
    "info": "Thông báo",
}


@core.route(
    "/approve/<int:user_id>/check-out/<string:token>/<int:acceptor_level>",
    methods=["GET"],
)
def approve_check_out(user_id, token, acceptor_level):
    # Check internet connection
    try:
        requests.get("http://www.google.com", timeout=5)
    except requests.ConnectionError:
        return render_template(
            "error.html",
            error_message="Không thể kết nối Internet. Vui lòng kiểm tra kết nối mạng của bạn và thử lại.",
        )
    try:
        # Retrieve the check-in record
        print(f"User ID: {user_id}, Token: {token}, Acceptor Level: {acceptor_level}")
        check_in_record = SponsorCheckIn.query.filter_by(
            user_id=user_id, token=token
        ).first()

        if not check_in_record:
            return render_template(
                "approval_status.html",
                status="error",
                message="Không tìm thấy yêu cầu phê duyệt này hoặc liên kết không hợp lệ.",
            )

        # Load the acceptors JSON field
        acceptors = json.loads(check_in_record.acceptors or "[]")
        if acceptor_level > len(acceptors):
            return render_template(
                "approval_status.html",
                status="error",
                message="Cấp phê duyệt không hợp lệ.",
            )

        # Get the current approver details
        current_acceptor = acceptors[acceptor_level - 1]
        current_status = current_acceptor.get("status", "Chờ duyệt")

        # Check if already approved
        if current_status == "accepted":
            return render_template(
                "approval_status.html",
                status="info",
                message=f"Yêu cầu ra ngoài của {check_in_record.full_name} đã được phê duyệt bởi cấp {acceptor_level} trước đó.",
            )

        # Update the current approver's status
        current_acceptor["status"] = "accepted"
        acceptors[acceptor_level - 1] = current_acceptor

        # Determine if this is the last approver
        if acceptor_level == len(acceptors):
            # All approvers have approved; update the global status
            check_in_record.status = "accepted"
            check_in_record.accepted_datetime = datetime.utcnow()
            check_in_record.acceptors = json.dumps(acceptors)
            db.session.commit()
            return render_template(
                "approval_status.html",
                status="success",
                message=f"Yêu cầu ra ngoài của {check_in_record.full_name} đã được phê duyệt bởi tất cả cấp duyệt!",
            )

        # Prepare for the next approver
        next_acceptor_level = acceptor_level + 1
        next_acceptor = acceptors[next_acceptor_level - 1]

        next_approver_email = next_acceptor.get(
            f"acceptor-level-{next_acceptor_level}-manager_id-manager_email", None
        )
        next_acceptor["status"] = "created"
        acceptors[next_acceptor_level - 1] = next_acceptor

        # Get public IP dynamically
        public_url = get_public_ip_and_port()
        if not public_url:
            return render_template(
                "error.html",
                error_message="Không thể lấy địa chỉ máy chủ. Vui lòng kiểm tra cấu hình mạng.",
            )

        # Prepare and send the approval email
        approval_url = f"{public_url}/approve/{user_id}/check-out/{token}/{next_acceptor_level}"
        subject = f"Approval Request for Check-in: {check_in_record.full_name}"
        approvers_list = [
            {
                "email": acceptor.get(
                    f"acceptor-level-{index + 1}-manager_id-manager_email"
                ),
                "name": acceptor.get(
                    f"acceptor-level-{index + 1}-manager_id-manager_full_name", "N/A"
                ),
                "status": STATUS_TRANSLATIONS.get(
                    acceptor.get("status", "Chờ duyệt"), "Chờ duyệt"
                ),
            }
            for index, acceptor in enumerate(acceptors)
        ]
        body_html = generate_html_email(
            check_in_record.full_name,
            check_in_record.military_unit_name or "N/A",
            datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S"),
            approval_url,
            approvers_list,
        )
        send_email(subject, next_approver_email, body_html)

        # Save updated acceptors to the database
        check_in_record.acceptors = json.dumps(acceptors)
        db.session.commit()

        return render_template(
            "approval_status.html",
            status="success",
            message=f"Yêu cầu ra ngoài của {check_in_record.full_name} đã được phê duyệt! Đã gửi yêu cầu tiếp theo cho cấp {next_acceptor_level}.",
        )

    except Exception as e:
        return render_template(
            "approval_status.html", status="error", message=f"Có lỗi xảy ra: {str(e)}"
        )


@core.route("/validate-face-scan", methods=["POST"])
def validate_face_scan():
    try:
        data = request.json
        identity_card = data.get("identity_card")
        check_in_record_id = data.get("check_in_record_id")
        captured_image = data.get("captured_image")

        # Validate inputs
        if not identity_card or not check_in_record_id or not captured_image:
            return jsonify({"error": "Thiếu thông tin cần thiết để xác minh."}), 400

        # Decode the captured image
        image_data = base64.b64decode(captured_image.split(",")[1])
        temp_image_path = os.path.join(
            "static", "temp", f"{identity_card}_captured.png"
        )
        os.makedirs(os.path.dirname(temp_image_path), exist_ok=True)
        with open(temp_image_path, "wb") as temp_image_file:
            temp_image_file.write(image_data)

        # Check if the user exists and has an approved check-in record
        user = User.query.filter_by(identity_card=identity_card).first()
        if not user:
            return jsonify({"error": "Không tìm thấy người dùng."}), 404

        check_in_record = SponsorCheckIn.query.filter_by(
            id=check_in_record_id, status="accepted"
        ).first()
        if not check_in_record:
            return (
                jsonify({"error": "Không tìm thấy phiếu kiểm tra được phê duyệt."}),
                404,
            )

        # Compare the captured face with the user's stored encoding
        stored_encoding_path = user.encoding_path
        if not os.path.exists(stored_encoding_path):
            return (
                jsonify({"error": "Không tìm thấy dữ liệu nhận diện khuôn mặt."}),
                404,
            )

        stored_encoding = np.load(stored_encoding_path)
        captured_image = face_recognition.load_image_file(temp_image_path)
        captured_encoding = face_recognition.face_encodings(captured_image)

        if not captured_encoding:
            return (
                jsonify({"error": "Không phát hiện khuôn mặt trong ảnh đã chụp."}),
                400,
            )

        match = face_recognition.compare_faces(
            [stored_encoding], captured_encoding[0], tolerance=0.6
        )

        if not match[0]:
            return jsonify({"error": "Khuôn mặt không khớp với dữ liệu đã lưu."}), 400

        # Validate if identity_card matches identity found in face recognition
        recognized_identity_card = os.path.basename(stored_encoding_path).split(".")[0]
        if recognized_identity_card != identity_card:
            return jsonify({"error": "CCCD từ nhận diện không khớp với dữ liệu."}), 400

        # Update database: check_out_time or check_in_time
        current_time = datetime.utcnow()
        if not check_in_record.check_out_time:
            check_in_record.check_out_time = current_time
        else:
            check_in_record.check_in_time = current_time
            check_in_record.status = "completed"

        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Xác minh thành công!",
                    "check_in_record": {
                        "id": check_in_record.id,
                        "identity_card": check_in_record.identity_card,
                        "status": check_in_record.status,
                        "check_in_time": (
                            check_in_record.check_in_time.isoformat()
                            if check_in_record.check_in_time
                            else None
                        ),
                        "check_out_time": (
                            check_in_record.check_out_time.isoformat()
                            if check_in_record.check_out_time
                            else None
                        ),
                    },
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"Lỗi xảy ra: {str(e)}"}), 500


@core.route("/api/confirm-relative-check-in/<identity_card>", methods=["POST"])
def confirm_relative_check_in(identity_card):
    try:
        # Fetch relative check-in record
        relative_check_in = (
            RelativeCheckIn.query.filter_by(
                identity_card=identity_card, status="accepted"
            )
            .order_by(RelativeCheckIn.created_time.desc())
            .first()
        )

        if not relative_check_in:
            return (
                jsonify({"error": "Không tìm thấy phiếu kiểm tra được phê duyệt."}),
                404,
            )

        # Update database: check_in_time or check_out_time
        current_time = datetime.utcnow()
        if not relative_check_in.check_in_time:
            relative_check_in.check_in_time = current_time
            message = "Đã quét thời gian vào thành công!"
        elif not relative_check_in.check_out_time:
            relative_check_in.check_out_time = current_time
            relative_check_in.status = "completed"
            relative_check_in.identity_card = None
            message = "Đã quét thời gian ra thành công!"
        else:
            return (
                jsonify(
                    {"error": "Người thân này đã hoàn thành check-in và check-out."}
                ),
                400,
            )

        # Commit the changes
        db.session.commit()

        # Respond with updated check-in record details
        return (
            jsonify(
                {
                    "message": message,
                    "relative_check_in": {
                        "id": relative_check_in.id,
                        "full_name": relative_check_in.full_name,
                        "identity_card": relative_check_in.identity_card,
                        "relationship": relative_check_in.relationship,
                        "unit_name": relative_check_in.unit_name or "N/A",
                        "status": relative_check_in.status,
                        "check_in_time": (
                            relative_check_in.check_in_time.isoformat()
                            if relative_check_in.check_in_time
                            else None
                        ),
                        "check_out_time": (
                            relative_check_in.check_out_time.isoformat()
                            if relative_check_in.check_out_time
                            else None
                        ),
                    },
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"Lỗi xảy ra: {str(e)}"}), 500


@core.route("/get_military_units", methods=["GET"])
@login_required
def get_military_units():
    units = MilitaryUnit.query.all()
    units_data = [{"id": unit.id, "name": unit.name} for unit in units]
    return jsonify(units_data)


@core.route("/get_military_manager", methods=["GET"])
@login_required
def get_military_manager():
    managers = User.query.filter_by(is_manager=True).all()
    managers_data = [
        {"id": manager.id, "name": manager.full_name} for manager in managers
    ]
    return jsonify(managers_data)


@core.route("/get_users_by_unit/<int:unit_id>", methods=["GET"])
@login_required
def get_users_by_unit(unit_id):
    users = User.query.filter_by(military_unit_id=unit_id).all()
    users_data = [{"id": user.id, "full_name": user.full_name} for user in users]
    return jsonify(users_data)


@core.route("/verify_second_password", methods=["GET", "POST"])
def verify_second_password():
    csrf_token_value = generate_csrf()
    if request.method == "POST":
        second_password = request.form.get("second_password")

        if not second_password:
            return render_template(
                "verify_password.html",
                error="Vui lòng nhập mật khẩu cấp hai.",
                csrf_token_value=csrf_token_value,
            )

        if not current_user.check_password(second_password):
            return render_template(
                "verify_password.html",
                error="Mật khẩu cấp hai không đúng.",
                csrf_token_value=csrf_token_value,
            )

        # Password verified, set session and redirect to the original destination
        session["second_level_verified"] = True
        next_url = session.pop("next_url", url_for("core.daskboard"))
        return redirect(next_url)

    return render_template("verify_password.html", csrf_token_value=csrf_token_value)


from flask import send_file, request
import io
import pandas as pd


@core.route("/generate_excel_template", methods=["GET"])
@login_required
def generate_excel_template():
    try:
        output = io.BytesIO()

        # Query the MilitaryUnit table for unit names
        military_units = MilitaryUnit.query.with_entities(MilitaryUnit.name).all()
        unit_names = ["Lựa chọn"] + sorted(unit.name for unit in military_units)

        # Create an Excel file using pandas and XlsxWriter
        with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
            # First sheet: Main data
            df_main = pd.DataFrame(
                {
                    "STT": [1, 2, 3],
                    "CCCD": ["123456789012", "123456789013", "123456789014"],
                    "Họ Và Tên": ["Nguyễn Anh Tú", "Phan Thị Thư", "Lê Thị Ái"],
                    "Email": [
                        "username1@gmail.com",
                        "username2@gmail.com",
                        "username3@gmail.com",
                    ],
                    "Tên Đăng Nhập": ["123456789012", "123456789013", "123456789014"],
                    "Mật Khẩu": ["123456", "123456", "123456"],
                    "Đơn vị": ["Lựa chọn", "Lựa chọn", "Lựa chọn"],
                }
            )
            df_main.to_excel(writer, index=False, sheet_name="Main")

            # Adjust column widths for Main sheet
            worksheet_main = writer.sheets["Main"]
            column_widths = [10, 20, 30, 30, 20, 20, 25]
            for col_idx, width in enumerate(column_widths, start=1):
                worksheet_main.set_column(col_idx - 1, col_idx - 1, width)

            # Second sheet: Options
            df_options = pd.DataFrame({"Đơn vị": unit_names})
            df_options.to_excel(writer, index=False, sheet_name="Options")

            # Adjust column widths for Options sheet
            worksheet_options = writer.sheets["Options"]
            worksheet_options.set_column(0, 0, 25)

            # Define the range in the Options sheet for the dropdown
            dropdown_range = f"Options!$A$2:$A${len(unit_names) + 1}"

            # Add data validation to the 'Cấp Bậc' column in Main sheet
            worksheet_main.data_validation(
                "G2:G1048576",  # Range for the Cấp Bậc column
                {
                    "validate": "list",
                    "source": dropdown_range,
                    "error_type": "stop",
                    "error_message": "Vui lòng chọn cấp bậc hợp lệ từ danh sách.",
                },
            )

        # Reset buffer and save Excel content
        output.seek(0)
        return send_file(
            output,
            as_attachment=True,
            download_name="template.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        current_app.logger.error(f"Error generating Excel template: {e}")
        return jsonify({"error": "Error generating Excel template"}), 500


@core.route("/generate_excel_template_import_normal_user", methods=["GET"])
@login_required
def generate_excel_template_import_normal_user():
    try:
        output = io.BytesIO()

        # Query the MilitaryUnit table for unit names
        military_units = MilitaryUnit.query.with_entities(MilitaryUnit.name).all()
        unit_names = ["Lựa chọn"] + sorted(unit.name for unit in military_units)

        # Create an Excel file using pandas and XlsxWriter
        with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
            # First sheet: Main data
            df_main = pd.DataFrame(
                {
                    "STT": [1, 2, 3],
                    "CCCD": ["123456789012", "123456789013", "123456789014"],
                    "Họ Và Tên": ["Nguyễn Anh Tú", "Phan Thị Thư", "Lê Thị Ái"],
                    "Đơn vị": ["Lựa chọn", "Lựa chọn", "Lựa chọn"],
                }
            )
            df_main.to_excel(writer, index=False, sheet_name="Main")

            # Adjust column widths for Main sheet
            worksheet_main = writer.sheets["Main"]
            column_widths = [10, 20, 30, 30, 20, 25]
            for col_idx, width in enumerate(column_widths, start=1):
                worksheet_main.set_column(col_idx - 1, col_idx - 1, width)

            # Second sheet: Options
            df_options = pd.DataFrame({"Đơn vị": unit_names})
            df_options.to_excel(writer, index=False, sheet_name="Options")

            # Adjust column widths for Options sheet
            worksheet_options = writer.sheets["Options"]
            worksheet_options.set_column(0, 0, 25)

            # Define the range in the Options sheet for the dropdown
            dropdown_range = f"Options!$A$2:$A${len(unit_names) + 1}"

            # Add data validation to the 'Cấp Bậc' column in Main sheet
            worksheet_main.data_validation(
                "D2:D1048576",  # Range for the Cấp Bậc column
                {
                    "validate": "list",
                    "source": dropdown_range,
                    "error_type": "stop",
                    "error_message": "Vui lòng chọn cấp bậc hợp lệ từ danh sách.",
                },
            )

        # Reset buffer and save Excel content
        output.seek(0)
        return send_file(
            output,
            as_attachment=True,
            download_name="template.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception as e:
        current_app.logger.error(f"Error generating Excel template: {e}")
        return jsonify({"error": "Error generating Excel template"}), 500


@core.route("/import_manager")
@login_required
def import_manager():
    csrf_token_value = generate_csrf()
    return render_template(
        "import_manager.html",
        username=current_user.username,
        csrf_token_value=csrf_token_value,
    )


@core.route("/unauthorized", methods=["GET"])
def unauthorized():
    return render_template("unauthorized.html"), 403


@core.app_template_filter("mask_cccd")
def mask_cccd(identity_card):
    """
    Masks the identity card number, showing only the last 4 digits.
    Example: "123456789012" -> "********9012"
    """
    if identity_card and len(identity_card) >= 4:
        return "*" * (len(identity_card) - 4) + identity_card[-4:]
    return identity_card or "N/A"


@core.app_template_filter("mask_email")
def mask_email(email):
    if not email or "@" not in email:
        return email
    local_part, domain = email.split("@", 1)
    masked_local = local_part[:4] + "*" * (len(local_part) - 4)
    return f"{masked_local}@{domain}"
