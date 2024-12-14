import uuid
from typing import io
from PIL import Image
import io

from flask_wtf.csrf import generate_csrf
from flask import (
    Blueprint,
    session,
)
from flask_login import login_user, current_user, logout_user, login_required
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from application import app, send_email
from application.decorator import roles_required
from application.email import generate_reset_password_email
from application.models import MilitaryUnit
from application.users.forms import (
    RegistrationForm,
    LoginForm,
    UpdateUserForm,
    DeleteUserForm,
)
from application.users.picture_handler import add_profile_pic
import os
import base64
import face_recognition
import numpy as np

users = Blueprint("users", __name__)


@users.route("/register", methods=["GET", "POST"])
def register():
    form = RegistrationForm()

    if form.validate_on_submit():
        user = User(
            email=form.email.data,
            username=form.username.data,
            password=form.password.data,
        )

        db.session.add(user)
        db.session.commit()
        flash("Thanks for registering! Now you can login!")
        return redirect(url_for("users.login"))
    return render_template("register.html", form=form)


@users.route("/login", methods=["GET", "POST"])
def login():
    form = LoginForm()
    error = None  # Default error message

    if request.method == "POST":
        if form.validate_on_submit():
            # Fetch user from the database using the username
            user = User.query.filter_by(username=form.username.data).first()

            # Handle user existence and password validation
            if not user:
                error = "Người dùng không tồn tại."
            elif not user.check_password(form.password.data):
                error = "Mật khẩu không đúng."
            else:
                # Log in the user
                try:
                    login_user(user)
                    if user.role not in ["SYSTEM_ADMIN_ROLE", "ADMIN_ROLE"]:
                        logout_user()
                        flash(
                            "Bạn không có quyền truy cập. Vui lòng liên hệ quản trị viên.",
                            "danger",
                        )
                        return redirect(url_for("core.unauthorized"))

                    next_page = request.args.get("next")
                    if not next_page or not next_page.startswith("/"):
                        next_page = url_for("core.daskboard")
                    return redirect(next_page)
                except Exception as e:
                    error = "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau."

        # If form validation fails
        elif form.errors:
            error_messages = [
                f"Error in {getattr(form, field).label.text}: {', '.join(errors)}"
                for field, errors in form.errors.items()
            ]
            error = " ".join(error_messages)
    if form.username.data is None:
        form.username.data = ""
    form.password.data = ""
    # Render the login template with error message
    return render_template("login.html", form=form, error=error)


@users.route("/logout")
def logout():
    session.pop("second_level_verified", None)
    logout_user()
    return redirect(url_for("users.login"))


@users.route("/profile")
@login_required
def profile():
    return redirect(url_for("users.account"))


@users.route("/member_list")
@login_required
def member_list():
    search_query = request.args.get("search", "")
    page = request.args.get("page", 1, type=int)
    form = DeleteUserForm()

    # Query users from database
    query = User.query
    if search_query:
        query = query.filter(
            db.or_(
                User.full_name.ilike(f"%{search_query}%"),
                User.identity_card.ilike(f"%{search_query}%"),
                User.military_unit_id.ilike(f"%{search_query}%"),
            )
        )

    pagination = query.paginate(page=page, per_page=10)
    users_list = pagination.items

    # return render_template("member_list.html", users=users_list, pagination=pagination)
    return render_template(
        "member_list.html", users=users_list, pagination=pagination, form=form
    )


@users.route("/soldier_info")
@login_required
def soldier_info():
    search_query = request.args.get("search", "")
    page = request.args.get("page", 1, type=int)
    form = DeleteUserForm()

    # Query users from database
    query = User.query
    if search_query:
        query = query.filter(
            db.or_(
                User.full_name.ilike(f"%{search_query}%"),
                User.identity_card.ilike(f"%{search_query}%"),
                User.military_unit_id.ilike(f"%{search_query}%"),
            )
        )

    pagination = query.paginate(page=page, per_page=100)
    users_list = pagination.items

    return render_template(
        "soldier_info.html", users=users_list, pagination=pagination, form=form
    )


def mask_identity_card(identity_card):
    """
    Masks the identity card number, showing only the last 4 digits.
    Example: "123456789012" -> "********9012"
    """
    if identity_card and len(identity_card) >= 4:
        return "*" * (len(identity_card) - 4) + identity_card[-4:]
    return identity_card or "N/A"


@users.route("/search_members", methods=["GET"])
@login_required
def search_members():
    query = request.args.get("query", "").strip()
    if query:
        users = User.query.filter(
            User.full_name.ilike(f"%{query}%") | User.identity_card.ilike(f"%{query}%")
        ).all()
    else:
        users = User.query.all()

    user_data = [
        {
            "id": user.id,
            "full_name": user.full_name,
            "identity_card": mask_identity_card(user.identity_card),
            "email": mask_email(user.email),
            "management_level": (
                user.military_manager.full_name if user.military_manager else "N/A"
            ),
            "military_manager_id": (
                user.military_manager.id if user.military_manager else "N/A"
            ),
            "unit_name": user.military_unit.name if user.military_unit else "N/A",
            "unit_id": user.military_unit.id if user.military_unit else "N/A",
            "note": user.note or "N/A",
            "created_time": (
                user.created_time.strftime("%d/%m/%Y") if user.created_time else "N/A"
            ),
        }
        for user in users
    ]
    return jsonify(user_data)


@users.route("/get_sponsor_details/<identity_card>", methods=["GET"])
def get_sponsor_details(identity_card):
    # Query the User model to find a user with the provided identity_card
    user = User.query.filter_by(identity_card=identity_card).first()

    if user:
        # Extract necessary details from military unit and manager
        military_unit_name = user.military_unit.name if user.military_unit else None
        military_unit_id = user.military_unit_id
        manager_full_name = (
            user.military_manager.full_name if user.military_manager else None
        )
        military_manager_id = user.military_manager_id

        # Return user details as JSON
        return (
            jsonify(
                {
                    "id": user.id,
                    "full_name": user.full_name,
                    "identity_card": user.identity_card,
                    "email": user.email,
                    "military_unit_name": military_unit_name,
                    "military_unit_id": military_unit_id,
                    "manager_full_name": manager_full_name,
                    "military_manager_id": military_manager_id,
                }
            ),
            200,
        )
    else:
        # Return an error message if user not found
        return jsonify({"error": "User not found"}), 404


@users.route("/view/<int:user_id>", methods=["GET"])
@login_required
def view(user_id):
    user = User.query.get_or_404(user_id)
    return render_template("view_user.html", user=user)


@users.route("/edit/<int:user_id>", methods=["GET", "POST"])
@login_required
def edit(user_id):
    user = User.query.get_or_404(user_id)

    if request.method == "POST":
        data = request.form
        user.username = data.get("username", user.username)
        user.email = data.get("email", user.email)
        # Add additional fields if necessary
        db.session.commit()
        flash("User details updated successfully!", "success")
        return redirect(url_for("users.member_list"))

    return render_template("edit_user.html", user=user)


@users.route("/delete/<int:user_id>", methods=["POST"])
@login_required
def delete(user_id):
    user = User.query.get_or_404(user_id)

    if user:
        try:
            db.session.delete(user)
            db.session.commit()
            flash("User deleted successfully!", "success")
        except Exception as e:
            flash(f"An error occurred while deleting the user: {str(e)}", "danger")
    else:
        flash("User not found.", "warning")

    return redirect(url_for("users.member_list"))


@users.route("/account", methods=["GET", "POST"])
@login_required
def account():

    form = UpdateUserForm()

    if form.validate_on_submit():
        print(form)
        if form.picture.data:
            username = current_user.username
            pic = add_profile_pic(form.picture.data, username)
            current_user.profile_image = pic

        current_user.username = form.username.data
        current_user.email = form.email.data
        db.session.commit()
        flash("User Account Updated")
        return redirect(url_for("users.account"))

    elif request.method == "GET":
        form.username.data = current_user.username
        form.email.data = current_user.email

    profile_image = url_for(
        "static", filename="profile_pics/" + current_user.profile_image
    )
    return render_template("account.html", profile_image=profile_image, form=form)


import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


@users.route("/input-personal-submit-data", methods=["POST"])
@login_required
def submit_data():
    try:
        # Parse and validate the input data
        data = request.get_json()
        identity_card = (data.get("identityCard") or "").strip()
        full_name = (data.get("fullName") or "").strip()
        email = (data.get("email") or "").strip()
        military_unit_id = (data.get("militaryMilitaryUnitId") or "").strip()
        military_manager_id = (data.get("militaryManagerId") or "").strip()
        note = (data.get("note") or "").strip()
        images = data.get("images", {})

        logger.debug(
            f"Received data: identity_card={identity_card}, full_name={full_name}, email={email}, "
            f"military_unit_id={military_unit_id}, military_manager_id={military_manager_id}, "
            f"note={note}, images_keys={list(images.keys())}"
        )

        # Validate required fields
        if not identity_card or not full_name:
            return jsonify({"error": "All fields are required"}), 400

        if not all(k in images for k in ["left", "right", "front"]):
            return jsonify({"error": "Missing one or more required images"}), 400

        # Check for duplicate email if provided
        if email:
            existing_email_user = User.query.filter(User.email == email).first()
            if existing_email_user and (
                existing_email_user.identity_card != identity_card
            ):
                return jsonify({"error": "Email đã được sử dụng"}), 400

        # Validate military unit if provided
        if military_unit_id:
            military_unit = MilitaryUnit.query.get(military_unit_id)
            if not military_unit:
                return jsonify({"error": "Đơn vị quân đội không hợp lệ"}), 400

        # Validate manager ID if provided
        if military_manager_id:
            manager = User.query.get(military_manager_id)
            if not manager:
                return jsonify({"error": "ID quản lý không hợp lệ"}), 400

        # Find the user by identity card
        existing_user = User.query.filter(User.identity_card == identity_card).first()

        if not existing_user:
            random_password = uuid.uuid4().hex
            target_user = User(
                email=email,
                username=identity_card,  # Use identity card as default username
                password=random_password,
                second_level_password=random_password,
                identity_card=identity_card,
                full_name=full_name,
                military_unit_id=military_unit_id,
                military_manager_id=military_manager_id,
                note=note,
            )
            target_user.identity_card = identity_card
        else:
            # Update the existing user
            target_user = existing_user
            target_user.email = email
            target_user.full_name = full_name
            target_user.military_unit_id = military_unit_id
            target_user.military_manager_id = military_manager_id
            target_user.note = note

        # Save images to disk

        upload_folder = app.config.get("UPLOAD_FOLDER")
        print(f"upload_folder: {upload_folder}")
        os.makedirs(upload_folder, exist_ok=True)

        image_paths = {}
        for key, base64_image in images.items():
            file_name = f"{identity_card}_{key}.png"
            file_path = os.path.join(upload_folder, file_name)
            print({"file_path')": file_path})
            with open(file_path, "wb") as image_file:
                image_file.write(base64.b64decode(base64_image.split(",")[1]))
            image_paths[key] = file_name

        # Process front image for face encoding
        front_image_path = image_paths["front"]
        face_encoding_path = None
        try:

            image = face_recognition.load_image_file(
                os.path.join(upload_folder, front_image_path)
            )
            face_encodings = face_recognition.face_encodings(image)
            print(f"1")
            if len(face_encodings) > 0:
                encoding = face_encodings[0]
                encoding_folder = app.config.get("FACE_DATA")
                os.makedirs(encoding_folder, exist_ok=True)
                face_encoding_path = os.path.join(
                    encoding_folder, f"{identity_card}.npy"
                )
                np.save(face_encoding_path, encoding)
            else:
                return jsonify({"error": "No face detected in the front image"}), 400
        except Exception as e:
            return jsonify({"error": f"Failed to process front image: {str(e)}"}), 500
        print(f"2")
        # Update user data
        target_user.identity_card = identity_card
        target_user.full_name = full_name
        target_user.military_unit_id = military_unit_id
        target_user.military_manager_id = military_manager_id
        target_user.left_image_path = image_paths["left"]
        target_user.right_image_path = image_paths["right"]
        target_user.front_image_path = front_image_path
        target_user.encoding_path = face_encoding_path

        # Commit changes
        db.session.add(target_user)  # Add in case it's a new user
        db.session.commit()

        # Serialize target user details for response
        user_details = {
            "id": target_user.id,
            "full_name": target_user.full_name,
            "identity_card": target_user.identity_card,
            "left_image_path": target_user.left_image_path,
            "right_image_path": target_user.right_image_path,
            "front_image_path": target_user.front_image_path,
            "encoding_path": target_user.encoding_path,
            "military_unit_id": target_user.military_unit_id,
            "military_manager_id": target_user.military_manager_id,
            "note": target_user.note,
        }

        return (
            jsonify({"message": "Data submitted successfully!", "user": user_details}),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500


@users.route("/soldier_info_personal_user/<user_id>", methods=["GET"])
@login_required
def soldier_info_personal_user(user_id):
    csrf_token_value = generate_csrf()
    user = User.query.get_or_404(user_id)
    return render_template(
        "soldier_info_personal_user.html", user=user, csrf_token_value=csrf_token_value
    )


# @users.route("/update_user/<int:user_id>", methods=["POST"])
# @login_required
# def update_user(user_id):
#     data = request.get_json()
#     user = User.query.get_or_404(user_id)
#
#     # Validate required fields
#     full_name = (data.get("fullName") or "").strip()
#     identity_card = (data.get("identityCard") or "").strip()
#     email = (data.get("email") or "").strip()
#     military_unit_id = (data.get("militaryUnitId") or "").strip()
#     military_manager_id = (data.get("militaryManagerId") or "").strip()
#     note = (data.get("note") or "").strip()
#     role = (data.get("role") or "").strip()
#
#     if not full_name:
#         return (
#             jsonify({"success": False, "message": "Họ và tên không được để trống."}),
#             400,
#         )
#     if not identity_card:
#         return (
#             jsonify({"success": False, "message": "CCCD không được để trống."}),
#             400,
#         )
#     if " " in identity_card:
#         return (
#             jsonify({"success": False, "message": "CCCD không được chứa khoảng trắng."}),
#             400,
#         )
#     if len(identity_card) != 12:
#         return (
#             jsonify({"success": False, "message": "CCCD phải có đúng 12 ký tự."}),
#             400,
#         )
#
# # Check for duplicate identity card if changed
#     if identity_card != user.identity_card:
#         existing_identity_user = User.query.filter(
#             User.identity_card == identity_card, User.id != user_id
#         ).first()
#         if existing_identity_user:
#             return (
#                 jsonify(
#                     {
#                         "success": False,
#                         "message": "CCCD đã được sử dụng bởi người dùng khác.",
#                     }
#                 ),
#                 400,
#             )
#
#     # Check for duplicate email if provided
#     if email:
#         existing_email_user = User.query.filter(
#             User.email == email, User.id != user_id
#         ).first()
#         if existing_email_user:
#             return jsonify({"success": False, "message": "Email đã được sử dụng."}), 400
#
#     # Validate military unit if provided
#     if military_unit_id:
#         military_unit = MilitaryUnit.query.get(military_unit_id)
#         if not military_unit:
#             return (
#                 jsonify({"success": False, "message": "ID đơn vị không hợp lệ."}),
#                 400,
#             )
#
#     # Validate manager ID if provided
#     if military_manager_id:
#         manager = User.query.get(military_manager_id)
#         if not manager:
#             return (
#                 jsonify({"success": False, "message": "ID quản lý không hợp lệ."}),
#                 400,
#             )
#
#     # Update the user details
#     user.full_name = full_name
#     user.email = email
#     user.military_unit_id = military_unit_id
#     user.military_manager_id = military_manager_id
#     user.note = note
#     user.role = role
#
#     db.session.commit()
#
#     return jsonify(
#         {"success": True, "message": "Thông tin đã được cập nhật thành công."}
#     )
@users.route("/update_user/<int:user_id>", methods=["POST"])
@login_required
@roles_required("SYSTEM_ADMIN_ROLE", "ADMIN_ROLE")
def update_user(user_id):
    data = request.get_json()
    user = User.query.get_or_404(user_id)

    # Validate required fields
    full_name = (data.get("fullName") or "").strip()
    identity_card = (data.get("identityCard") or "").strip()
    email = (data.get("email") or "").strip()
    military_unit_id = (data.get("militaryUnitId") or "").strip()
    military_manager_id = (data.get("militaryManagerId") or "").strip()
    note = (data.get("note") or "").strip()
    role = (data.get("role") or "").strip()

    # Validate full name
    if not full_name:
        return (
            jsonify({"success": False, "message": "Họ và tên không được để trống."}),
            400,
        )

    # Validate identity card
    if not identity_card:
        return (
            jsonify({"success": False, "message": "CCCD không được để trống."}),
            400,
        )
    if " " in identity_card:
        return (
            jsonify(
                {"success": False, "message": "CCCD không được chứa khoảng trắng."}
            ),
            400,
        )
    if len(identity_card) != 12:
        return (
            jsonify({"success": False, "message": "CCCD phải có đúng 12 ký tự."}),
            400,
        )

    # Check for duplicate identity card if changed
    if identity_card != user.identity_card:
        existing_identity_user = User.query.filter(
            User.identity_card == identity_card, User.id != user_id
        ).first()
        if existing_identity_user:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "CCCD đã được sử dụng bởi người dùng khác.",
                    }
                ),
                400,
            )

    # Check for duplicate email if provided
    if email:
        existing_email_user = User.query.filter(
            User.email == email, User.id != user_id
        ).first()
        if existing_email_user:
            return jsonify({"success": False, "message": "Email đã được sử dụng."}), 400

    # Validate military unit if provided
    if military_unit_id:
        military_unit = MilitaryUnit.query.get(military_unit_id)
        if not military_unit:
            return (
                jsonify({"success": False, "message": "ID đơn vị không hợp lệ."}),
                400,
            )

    # Validate manager ID if provided
    if military_manager_id:
        manager = User.query.get(military_manager_id)
        if not manager:
            return (
                jsonify({"success": False, "message": "ID quản lý không hợp lệ."}),
                400,
            )

    # Update the user details
    user.full_name = full_name
    user.identity_card = identity_card  # Update identity card
    user.email = email
    user.military_unit_id = military_unit_id
    user.military_manager_id = military_manager_id
    user.note = note
    user.role = role

    db.session.commit()

    return jsonify(
        {"success": True, "message": "Thông tin đã được cập nhật thành công."}
    )


def mask_email(email):
    if not email or "@" not in email:
        return None
    local_part, domain = email.split("@", 1)
    masked_local = local_part[:4] + "*" * (len(local_part) - 4)
    return f"{masked_local}@{domain}"


@users.route("/get_user_details/<int:user_id>", methods=["GET"])
@login_required
def get_user_details(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(
        {
            "id": user.id,
            "full_name": user.full_name,
            "note": user.note,
            "role": user.role,
            "identity_card": mask_identity_card(user.identity_card),
            "email": mask_email(user.email),
            "management_level": (
                user.military_manager.full_name if user.military_manager else "N/A"
            ),
            "military_manager_id": (
                user.military_manager.id if user.military_manager else "N/A"
            ),
            "military_unit_name": (
                user.military_unit.name if user.military_unit else "N/A"
            ),
            "military_unit_id": user.military_unit.id if user.military_unit else "N/A",
            # "note": user.note or "N/A",
            "created_time": (
                user.created_time.strftime("%d/%m/%Y") if user.created_time else "N/A"
            ),
        }
    )


@users.route("/get_military_unit_by_id/<int:unit_id>", methods=["GET"])
@login_required
def get_military_unit_by_id(unit_id):
    military_unit = MilitaryUnit.query.get_or_404(unit_id)
    return jsonify({"id": military_unit.id, "name": military_unit.name})


@users.route("/get_user_by_id/<int:user_id>", methods=["GET"])
@login_required
def get_user_by_id(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({"id": user.id, "full_name": user.full_name})


from flask import request, jsonify, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from application import db
from application.models import User

import re


def is_password_strong(password):
    """Check if password meets security requirements."""
    regex = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
    return bool(re.match(regex, password))


@users.route("/change_password", methods=["POST"])
@login_required
def change_password():
    data = request.get_json()
    current_password = data.get("current_password", "").strip()
    new_password = data.get("new_password", "").strip()

    if not check_password_hash(current_user.password, current_password):
        return (
            jsonify({"success": False, "message": "Mật khẩu hiện tại không đúng."}),
            400,
        )

    if not is_password_strong(new_password):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
                }
            ),
            400,
        )

    current_user.password = generate_password_hash(new_password)
    db.session.commit()
    return (
        jsonify({"success": True, "message": "Mật khẩu đã được thay đổi thành công."}),
        200,
    )


@users.route("/change_second_level_password", methods=["POST"])
@login_required
def change_second_level_password():
    data = request.get_json()
    current_password = data.get("current_password", "").strip()
    new_password = data.get("new_password", "").strip()

    # Assuming `second_level_password` is a field in the User model
    if not check_password_hash(current_user.second_level_password, current_password):
        return (
            jsonify(
                {"success": False, "message": "Mật khẩu cấp hai hiện tại không đúng."}
            ),
            400,
        )

    if not is_password_strong(new_password):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
                }
            ),
            400,
        )

    current_user.second_level_password = generate_password_hash(new_password)
    db.session.commit()
    return (
        jsonify(
            {
                "success": True,
                "message": "Mật khẩu cấp hai đã được thay đổi thành công.",
            }
        ),
        200,
    )


@users.route("/forget_password", methods=["GET", "POST"])
def forget_password():
    csrf_token = generate_csrf()

    if request.method == "POST":
        try:
            # Parse request payload
            data = request.get_json() if request.is_json else request.form
            email = data.get("email")

            user = User.query.filter_by(email=email).first()
            if not user:
                return (
                    jsonify({"success": False, "message": "Email không tồn tại."}),
                    400,
                )

            # Generate reset token
            serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])
            token = serializer.dumps(user.id, salt="reset-password")
            user.reset_token = token
            db.session.commit()

            # Send reset link

            reset_url = url_for("users.reset_password", token=token, _external=True)
            subject = "Reset Your Password"
            email_content = generate_reset_password_email(user.full_name, reset_url)
            send_email(subject, user.email, email_content)

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Liên kết đặt lại mật khẩu đã được gửi đến email của bạn.",
                    }
                ),
                200,
            )

        except Exception as e:
            app.logger.error(f"Error during password reset: {str(e)}")
            return (
                jsonify(
                    {"success": False, "message": "Có lỗi xảy ra khi xử lý yêu cầu."}
                ),
                500,
            )

    # Render reset password form for GET
    return render_template("forget_password.html", csrf_token=csrf_token)


@users.route("/reset_password/<token>", methods=["GET", "POST"])
def reset_password(token):
    try:
        # Decode the token
        serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])
        user_id = serializer.loads(token, salt="reset-password", max_age=300)
        user = User.query.get_or_404(user_id)

        # Check if token is valid
        if user.reset_token is None or user.reset_token != token:
            if request.is_json:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Invalid or already used reset token.",
                        }
                    ),
                    400,
                )
            return render_template(
                "reset_error.html",
                error_message="Invalid or already used reset token.",
            )

        if request.method == "POST":
            if request.is_json:
                data = request.get_json()
                new_password = data.get("new_password", "").strip()
                confirm_password = data.get("confirm_password", "").strip()

                # Validate passwords
                if len(new_password) < 8:
                    return (
                        jsonify(
                            {
                                "success": False,
                                "message": "Password must be at least 8 characters long.",
                            }
                        ),
                        400,
                    )

                if (
                    not any(char.isupper() for char in new_password)
                    or not any(char.islower() for char in new_password)
                    or not any(char.isdigit() for char in new_password)
                    or not any(char in "@$!%*?&" for char in new_password)
                ):
                    return (
                        jsonify(
                            {
                                "success": False,
                                "message": "Password must include uppercase, lowercase, number, and special character.",
                            }
                        ),
                        400,
                    )

                if new_password != confirm_password:
                    return (
                        jsonify(
                            {"success": False, "message": "Passwords do not match."}
                        ),
                        400,
                    )

                # Update user's password
                user.password = generate_password_hash(new_password)
                user.reset_token = None  # Invalidate the token
                db.session.commit()

                return jsonify(
                    {
                        "success": True,
                        "message": "Your password has been reset successfully.",
                    }
                )

        # Render reset password form
        csrf_token_value = generate_csrf()
        return render_template(
            "reset_password.html", token=token, csrf_token=csrf_token_value
        )

    except SignatureExpired:
        if request.is_json:
            return (
                jsonify({"success": False, "message": "The reset link has expired."}),
                400,
            )
        return render_template(
            "reset_error.html",
            error_message="The reset link has expired.",
        )
    except BadSignature:
        if request.is_json:
            return jsonify({"success": False, "message": "Invalid reset link."}), 400
        return render_template(
            "reset_error.html",
            error_message="Invalid reset link.",
        )


@users.route("/get_managers", methods=["GET"])
@login_required
def get_managers():
    managers = User.query.filter_by(is_manager=True).all()
    return jsonify(
        [
            {
                "id": manager.id,
                "full_name": manager.full_name,
                "identity_card": manager.identity_card,
            }
            for manager in managers
        ]
    )


@users.route("/get_user_by_identity/<identity_card>", methods=["GET"])
@login_required
def get_user_by_identity(identity_card):
    user = User.query.filter_by(identity_card=identity_card).first()
    if user:
        return (
            jsonify(
                {
                    "identity_card": user.identity_card,
                    "full_name": user.full_name,
                    "management_level": user.military_manager_full_name,
                    "unit_name": (
                        user.military_unit.name if user.military_unit else None
                    ),
                }
            ),
            200,
        )
    else:
        return jsonify({"error": "User not found"}), 404


@users.route("/api/import-manager-users", methods=["POST"])
@login_required
@roles_required("SYSTEM_ADMIN_ROLE", "ADMIN_ROLE")
def import_manager_users():
    try:
        # Ensure the payload contains a 'users' key
        payload = request.json
        if not payload or not isinstance(payload, dict) or "users" not in payload:
            return jsonify({"error": "Invalid data format"}), 400

        data = payload["users"]  # Extract the users list
        if not isinstance(data, list):  # Validate the 'users' key is a list
            return jsonify({"error": "Invalid data format"}), 400

        results = []

        # Fetch all military units into a dictionary for mapping by ID
        military_units = {unit.id: unit for unit in MilitaryUnit.query.all()}

        # Fetch all existing identity cards for validation
        existing_identity_cards = {
            user.identity_card: user.id for user in User.query.all()
        }

        for index, user in enumerate(data, start=1):
            print(f"Processing user {user}")
            user_index = str(user.get("index", "")).strip()
            cccd = user.get("identityCardNumber", "").strip()
            full_name = user.get("fullName", "").strip()
            email = user.get("email", "").strip()
            username = user.get("username", "").strip()
            password = user.get("password", "").strip()
            second_password = user.get("secondPassword", "").strip()
            unit_id = user.get("unit", "").strip()

            # Validate CCCD length and uniqueness
            if len(cccd) != 12:
                results.append(
                    {
                        "index": user_index,
                        "identityCardNumber": cccd,
                        "fullName": full_name,
                        "email": email,
                        "username": username,
                        "password": password,
                        "secondPassword": second_password,
                        "unit": unit_id,
                        "success": False,
                        "note": "CCCD không đủ 12 ký tự",
                    }
                )
                continue

            if cccd in existing_identity_cards:
                results.append(
                    {
                        "index": user_index,
                        "identityCardNumber": cccd,
                        "fullName": full_name,
                        "email": email,
                        "username": username,
                        "password": password,
                        "secondPassword": second_password,
                        "unit": unit_id,
                        "success": False,
                        "note": "CCCD đã tồn tại trong hệ thống",
                    }
                )
                continue

            # Check if the email is already in use
            if email and User.query.filter(User.email == email).first():
                results.append(
                    {
                        "index": user_index,
                        "identityCardNumber": cccd,
                        "fullName": full_name,
                        "email": email,
                        "username": username,
                        "password": password,
                        "secondPassword": second_password,
                        "unit": unit_id,
                        "success": False,
                        "note": "Email đã được sử dụng",
                    }
                )
                continue

            # Check if the username is already in use
            if username and User.query.filter(User.username == username).first():
                results.append(
                    {
                        "index": user_index,
                        "identityCardNumber": cccd,
                        "fullName": full_name,
                        "email": email,
                        "username": username,
                        "password": password,
                        "secondPassword": second_password,
                        "unit": unit_id,
                        "success": False,
                        "note": "Tên đăng nhập đã được sử dụng",
                    }
                )
                continue

            # Validate military unit
            if unit_id and (
                not unit_id.isdigit() or int(unit_id) not in military_units
            ):
                results.append(
                    {
                        "index": user_index,
                        "identityCardNumber": cccd,
                        "fullName": full_name,
                        "email": email,
                        "username": username,
                        "password": password,
                        "secondPassword": second_password,
                        "unit": unit_id,
                        "success": False,
                        "note": f"Mã đơn vị '{unit_id}' không tồn tại trong hệ thống",
                    }
                )
                continue

            military_unit = military_units.get(int(unit_id)) if unit_id else None

            # Create a new user
            new_user = User(
                identity_card=cccd,
                username=username,
                password=password,
                second_level_password=second_password,
                full_name=full_name,
                email=email,
                military_unit_id=military_unit.id if military_unit else None,
                military_unit_name=military_unit.name if military_unit else None,
                created_by_id=current_user.id,
                is_manager=True,
                role="ADMIN_ROLE",
            )
            db.session.add(new_user)
            results.append(
                {
                    "index": user_index,
                    "identityCardNumber": cccd,
                    "fullName": full_name,
                    "email": email,
                    "username": username,
                    "password": password,
                    "secondPassword": second_password,
                    "unit": unit_id,
                    "success": True,
                    "note": "Người dùng được thêm thành công",
                }
            )

        db.session.commit()
        return jsonify(results), 200

    except Exception as e:
        app.logger.error(f"Error importing users: {e}")
        return jsonify({"error": "Internal server error"}), 500

    except Exception as e:
        app.logger.error(f"Error importing users: {e}")
        return jsonify({"error": "Internal server error"}), 500


import uuid


@users.route("/api/import-normal-users", methods=["POST"])
@login_required
@roles_required("SYSTEM_ADMIN_ROLE", "ADMIN_ROLE")
def import_normal_users():
    try:
        # Ensure the payload contains a 'users' key
        payload = request.json
        if not payload or not isinstance(payload, dict) or "users" not in payload:
            return jsonify({"error": "Invalid data format"}), 400

        data = payload["users"]  # Extract the users list
        if not isinstance(data, list):  # Validate the 'users' key is a list
            return jsonify({"error": "Invalid data format"}), 400

        results = []

        # Fetch all military units into a dictionary for mapping
        military_units = {unit.id: unit for unit in MilitaryUnit.query.all()}
        images = payload.get("images", {})

        def resize_image(base64_image, max_size=720):
            """Resize image to a maximum dimension of max_size, maintaining aspect ratio."""
            try:
                # Decode the base64 image
                image_data = base64.b64decode(base64_image.split(",")[1])
                image = Image.open(io.BytesIO(image_data))  # Ensure io.BytesIO is used

                # Resize if necessary
                if max(image.size) > max_size:
                    image.thumbnail((max_size, max_size), Image.ANTIALIAS)

                # Convert back to base64
                buffer = io.BytesIO()  # Ensure io.BytesIO is used
                image.save(buffer, format="PNG")
                resized_base64 = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"
                return resized_base64
            except Exception as e:
                raise ValueError(f"Image processing failed: {str(e)}")

        for index, user in enumerate(data, start=1):
            user_index = str(user.get("index", "")).strip()
            cccd = user.get("identityCardNumber", "").strip()
            full_name = user.get("fullName", "").strip()
            unit_id = user.get("unit", "").strip()
            user_images = images.get(cccd, {})

            # Validate CCCD length
            if len(cccd) != 12:
                results.append(
                    {
                        "index": user_index,
                        "identityCardNumber": cccd,
                        "fullName": full_name,
                        "unit": unit_id,
                        "success": False,
                        "note": "CCCD không đủ 12 ký tự",
                    }
                )
                continue

            # Check for existing user
            existing_user = User.query.filter_by(identity_card=cccd).first()
            if existing_user:
                results.append(
                    {
                        "index": user_index,
                        "identityCardNumber": cccd,
                        "fullName": full_name,
                        "unit": unit_id,
                        "success": False,
                        "note": "Người dùng đã tồn tại",
                    }
                )
                continue

            # Validate military unit
            military_unit = (
                military_units.get(int(unit_id)) if unit_id.isdigit() else None
            )
            if unit_id and not military_unit:
                results.append(
                    {
                        "index": user_index,
                        "identityCardNumber": cccd,
                        "fullName": full_name,
                        "unit": unit_id,
                        "success": False,
                        "note": f"Đơn vị '{unit_id}' không tồn tại trong hệ thống",
                    }
                )
                continue

            # Process images for face recognition
            if not all(k in user_images for k in ["left", "right", "front"]):
                missing_images = [
                    k for k in ["left", "right", "front"] if k not in user_images
                ]
                results.append(
                    {
                        "index": user_index,
                        "identityCardNumber": cccd,
                        "fullName": full_name,
                        "unit": unit_id,
                        "success": False,
                        "note": f"Thiếu ảnh cần thiết: {', '.join(missing_images)}",
                    }
                )
                continue

            image_paths = {}
            upload_folder = app.config.get("UPLOAD_FOLDER")
            os.makedirs(upload_folder, exist_ok=True)

            for key, base64_image in user_images.items():
                try:
                    resized_image = resize_image(base64_image)
                    file_name = f"{cccd}_{key}.png"
                    file_path = os.path.join(upload_folder, file_name)
                    with open(file_path, "wb") as image_file:
                        image_file.write(base64.b64decode(resized_image.split(",")[1]))
                    image_paths[key] = file_name
                except ValueError as e:
                    results.append(
                        {
                            "index": user_index,
                            "identityCardNumber": cccd,
                            "fullName": full_name,
                            "unit": unit_id,
                            "success": False,
                            "note": f"Lỗi xử lý ảnh {key}: {str(e)}",
                        }
                    )
                    continue

            # Extract face encodings from the front image
            front_image_path = image_paths.get("front")
            face_encoding_path = None
            try:
                image = face_recognition.load_image_file(
                    os.path.join(upload_folder, front_image_path)
                )
                face_encodings = face_recognition.face_encodings(image)
                if face_encodings:
                    encoding = face_encodings[0]
                    encoding_folder = app.config.get("FACE_DATA")
                    os.makedirs(encoding_folder, exist_ok=True)
                    face_encoding_path = os.path.join(encoding_folder, f"{cccd}.npy")
                    np.save(face_encoding_path, encoding)
                else:
                    results.append(
                        {
                            "index": user_index,
                            "identityCardNumber": cccd,
                            "fullName": full_name,
                            "unit": unit_id,
                            "success": False,
                            "note": "Không phát hiện khuôn mặt trong ảnh chính diện",
                        }
                    )
                    continue
            except Exception as e:
                results.append(
                    {
                        "index": user_index,
                        "identityCardNumber": cccd,
                        "fullName": full_name,
                        "unit": unit_id,
                        "success": False,
                        "note": f"Lỗi xử lý ảnh chính diện: {str(e)}",
                    }
                )
                continue

            # Create a new user with random default values for required fields
            new_user = User(
                email=None,
                username=None,
                password=str(uuid.uuid4()),
                second_level_password=str(uuid.uuid4()),
                identity_card=cccd,
                full_name=full_name,
                military_unit_id=military_unit.id if military_unit else None,
                military_unit_name=military_unit.name if military_unit else None,
                created_by_id=current_user.id,
                left_image_path=image_paths["left"],
                right_image_path=image_paths["right"],
                front_image_path=image_paths["front"],
                encoding_path=face_encoding_path,
            )
            db.session.add(new_user)
            results.append(
                {
                    "index": user_index,
                    "identityCardNumber": cccd,
                    "fullName": full_name,
                    "unit": unit_id,
                    "success": True,
                    "note": "Người dùng được thêm thành công",
                }
            )

        db.session.commit()
        return jsonify(results), 200

    except Exception as e:
        app.logger.error(f"Error importing users: {e}")
        return jsonify({"error": "Internal server error"}), 500
