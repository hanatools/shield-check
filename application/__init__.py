from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from application.config import Config
from flask_wtf.csrf import CSRFProtect
from flask_mail import Mail, Message
import logging
import pytz

csrf = CSRFProtect()


app = Flask(__name__)

app.config.from_object(Config)
csrf.init_app(app)
db = SQLAlchemy(app)
Migrate(app, db)
mail = Mail(app)

# Define Vietnamese timezone globally
VIETNAM_TIMEZONE = pytz.timezone("Asia/Ho_Chi_Minh")

# Helper function to convert datetime to Vietnamese local time
def to_vietnam_time(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)  # Assume UTC if timezone info is missing
    return dt.astimezone(VIETNAM_TIMEZONE)

# Add Jinja filter for templates
@app.template_filter("vietnam_time")
def vietnam_time_filter(dt, fmt="%H:%M:%S %d/%m/%Y"):
    vn_time = to_vietnam_time(dt)
    return vn_time.strftime(fmt) if vn_time else "N/A"


def send_email(subject, recipient, body_html=None):

    logging.info(f"Preparing to send email to {recipient}")

    # Create the email message
    msg = Message(
        subject=subject,
        sender=app.config["MAIL_DEFAULT_SENDER"],
        recipients=[recipient],
    )
    msg.html = body_html  # HTML content

    # Send the email
    mail.send(msg)

    logging.info(f"Email sent successfully to {recipient}")
    return {
        "status": "success",
        "message": f"Email sent successfully to {recipient}",
    }


###########################
#### LOGIN CONFIGS #######
#########################

login_manager = LoginManager()

# We can now pass in our app to the login manager
login_manager.init_app(app)

# Tell users what view to go to when they need to login.
login_manager.login_view = "users.login"


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)

    from application.models import User

    with app.app_context():
        db.create_all()

    return app


@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    upload_folder = app.config["UPLOAD_FOLDER_ABSOLUTE_PATH"]
    print("Resolved UPLOAD_FOLDER:", upload_folder)
    return send_from_directory(upload_folder, filename)


###########################
#### BLUEPRINT CONFIGS #######
#########################

# Import these at the top if you want
# We've imported them here for easy reference
from application.core.views import core
from application.users.views import users
from application.error_pages.handlers import error_pages

# Register the apps
app.register_blueprint(users)
app.register_blueprint(core)
app.register_blueprint(error_pages)
