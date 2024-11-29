from flask import render_template, request, Blueprint, Response
from application.models import BlogPost
from flask_login import login_required, current_user
from pyzbar.pyzbar import decode
import numpy as np
import threading

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
# @login_required
def input_personal():
    return render_template("input_personal.html", username=current_user.username)


@core.route("/batch_input")
# @login_required
def batch_input():
    return render_template("batch_input.html", username=current_user.username)


@core.route("/register_relative")
# @login_required
def register_relative():
    return render_template("register_relative.html", username=current_user.username)


@core.route("/register_soldier")
# @login_required
def register_soldier():
    return render_template("register_soldier.html", username=current_user.username)


@core.route("/soldier_info")
# @login_required
def soldier_info():
    return render_template("soldier_info.html", username=current_user.username)


@core.route("/reports")
# @login_required
def reports():
    return render_template("reports.html", username=current_user.username)


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
