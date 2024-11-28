from flask import render_template, request, Blueprint
from application.models import BlogPost
from flask_login import login_required, current_user

core = Blueprint("core", __name__)


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
