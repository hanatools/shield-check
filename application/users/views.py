from flask import render_template, url_for, flash, redirect, request, Blueprint, jsonify
from flask_login import login_user, current_user, logout_user, login_required
from application import db, app
from werkzeug.security import generate_password_hash, check_password_hash
from application.models import User, BlogPost
from application.users.forms import RegistrationForm, LoginForm, UpdateUserForm, DeleteUserForm
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
                error = "User does not exist."
            elif not user.check_password(form.password.data):
                error = "Incorrect password."
            else:
                # Log in the user
                try:
                    login_user(user)
                    next_page = request.args.get("next")
                    if not next_page or not next_page.startswith("/"):
                        next_page = url_for("core.daskboard")
                    return redirect(next_page)
                except Exception as e:
                    error = "An unexpected error occurred. Please try again later."

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
    logout_user()
    return redirect(url_for("users.login"))


@users.route("/profile")
@login_required
def profile():
    return redirect(url_for("users.account"))


@users.route("/change_password")
@login_required
def change_password():
    return (redirect(url_for("users.change_password")))


# @users.route("/member_list")
# @login_required
# def member_list():
#     return render_template("member_list.html")

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
                User.unit_name.ilike(f"%{search_query}%"),
            )
        )

    pagination = query.paginate(page=page, per_page=10)
    users_list = pagination.items

    # return render_template("member_list.html", users=users_list, pagination=pagination)
    return render_template("member_list.html", users=users_list, pagination=pagination, form=form)

@users.route("/search_members", methods=["GET"])
@login_required
def search_members():
    query = request.args.get("query", "").strip()
    if query:
        users = User.query.filter(
            User.full_name.ilike(f"%{query}%")
            | User.identity_card.ilike(f"%{query}%")
        ).all()
    else:
        users = User.query.all()

    user_data = [
        {
            "id": user.id,
            "full_name": user.full_name,
            "identity_card": user.identity_card,
            "management_level": user.management_level
        }
        for user in users
    ]
    return jsonify(user_data)

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


@users.route("/<username>")
def user_posts(username):
    page = request.args.get("page", 1, type=int)
    user = User.query.filter_by(username=username).first_or_404()
    blog_posts = (
        BlogPost.query.filter_by(author=user)
        .order_by(BlogPost.date.desc())
        .paginate(page=page, per_page=5)
    )
    return render_template("user_blog_posts.html", blog_posts=blog_posts, user=user)

# @users.route("/submit-data", methods=["POST"])
# @login_required
# def submit_data():
#     try:
#         # Parse and validate the input data
#         data = request.get_json()
#         identity_card = data.get('identityCard', '').strip()
#         full_name = data.get('fullName', '').strip()
#         management_level = data.get('managementLevel', '').strip()
#         unit_name = data.get('unitName', '').strip()
#         images = data.get('images', {})
#
#         # Validate required fields
#         if not identity_card or not full_name or not management_level or not unit_name:
#             return jsonify({"error": "All fields are required"}), 400
#
#         if not all(k in images for k in ['left', 'right', 'front']):
#             return jsonify({"error": "Missing one or more required images"}), 400
#
#         # Check if the identity card already exists (for another user)
#         existing_user = User.query.filter(
#             User.identity_card == identity_card
#         ).first()
#         if existing_user:
#             return jsonify({"error": "Identity card already exists"}), 400
#
#         # Save images to disk
#         upload_folder = app.config.get('UPLOAD_FOLDER', 'static/uploads')
#         os.makedirs(upload_folder, exist_ok=True)
#
#         image_paths = {}
#         for key, base64_image in images.items():
#             file_path = os.path.join(upload_folder, f"{identity_card}_{key}.png")
#             with open(file_path, "wb") as image_file:
#                 image_file.write(base64.b64decode(base64_image.split(",")[1]))
#             image_paths[key] = file_path
#
#         # Process front image for face encoding
#         front_image_path = image_paths['front']
#         face_encoding_path = None
#         try:
#             image = face_recognition.load_image_file(front_image_path)
#             face_encodings = face_recognition.face_encodings(image)
#
#             if len(face_encodings) > 0:
#                 encoding = face_encodings[0]
#                 encoding_folder = app.config.get('FACE_DATA', 'static/face_data')
#                 os.makedirs(encoding_folder, exist_ok=True)
#                 face_encoding_path = os.path.join(encoding_folder, f"{identity_card}.npy")
#                 np.save(face_encoding_path, encoding)
#             else:
#                 return jsonify({"error": "No face detected in the front image"}), 400
#         except Exception as e:
#             return jsonify({"error": f"Failed to process front image: {str(e)}"}), 500
#
#         # Update current user's data
#         current_user.identity_card = identity_card
#         current_user.full_name = full_name
#         current_user.management_level = management_level
#         current_user.unit_name = unit_name
#         current_user.left_image_path = image_paths['left']
#         current_user.right_image_path = image_paths['right']
#         current_user.front_image_path = front_image_path
#         current_user.encoding_path = face_encoding_path
#
#         db.session.commit()
#
#         return jsonify({"message": "Data submitted successfully!"}), 200
#
#     except Exception as e:
#         return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@users.route("/submit-data", methods=["POST"])
@login_required
def submit_data():
    try:
        # Parse and validate the input data
        data = request.get_json()
        identity_card = data.get('identityCard', '').strip()
        full_name = data.get('fullName', '').strip()
        management_level = data.get('managementLevel', '').strip()
        unit_name = data.get('unitName', '').strip()
        images = data.get('images', {})

        # Validate required fields
        if not identity_card or not full_name or not management_level or not unit_name:
            return jsonify({"error": "All fields are required"}), 400

        if not all(k in images for k in ['left', 'right', 'front']):
            return jsonify({"error": "Missing one or more required images"}), 400

        # Find the user by identity card
        existing_user = User.query.filter(User.identity_card == identity_card).first()

        # If user exists, override their data; otherwise, update the current user
        target_user = existing_user if existing_user else current_user

        # Save images to disk
        upload_folder = app.config.get('UPLOAD_FOLDER', 'static/uploads')
        os.makedirs(upload_folder, exist_ok=True)

        image_paths = {}
        for key, base64_image in images.items():
            file_path = os.path.join(upload_folder, f"{identity_card}_{key}.png")
            with open(file_path, "wb") as image_file:
                image_file.write(base64.b64decode(base64_image.split(",")[1]))
            image_paths[key] = file_path

        # Process front image for face encoding
        front_image_path = image_paths['front']
        face_encoding_path = None
        try:
            image = face_recognition.load_image_file(front_image_path)
            face_encodings = face_recognition.face_encodings(image)

            if len(face_encodings) > 0:
                encoding = face_encodings[0]
                encoding_folder = app.config.get('FACE_DATA', 'static/face_data')
                os.makedirs(encoding_folder, exist_ok=True)
                face_encoding_path = os.path.join(encoding_folder, f"{identity_card}.npy")
                np.save(face_encoding_path, encoding)
            else:
                return jsonify({"error": "No face detected in the front image"}), 400
        except Exception as e:
            return jsonify({"error": f"Failed to process front image: {str(e)}"}), 500

        # Update user data
        target_user.identity_card = identity_card
        target_user.full_name = full_name
        target_user.management_level = management_level
        target_user.unit_name = unit_name
        target_user.left_image_path = image_paths['left']
        target_user.right_image_path = image_paths['right']
        target_user.front_image_path = front_image_path
        target_user.encoding_path = face_encoding_path

        # Commit changes
        db.session.add(target_user)  # Add in case it's a new user
        db.session.commit()

        return jsonify({"message": "Data submitted successfully!"}), 200

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500