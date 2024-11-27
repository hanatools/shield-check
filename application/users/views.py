from flask import render_template, url_for, flash, redirect, request, Blueprint, jsonify
from flask_login import login_user, current_user, logout_user, login_required
from application import db
from werkzeug.security import generate_password_hash, check_password_hash
from application.models import User, BlogPost
from application.users.forms import RegistrationForm, LoginForm, UpdateUserForm
from application.users.picture_handler import add_profile_pic


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
    return redirect(url_for("users.change_password"))


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
