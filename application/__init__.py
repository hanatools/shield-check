import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from application.config import Config
from flask_wtf.csrf import CSRFProtect
from flask_mail import Mail, Message
import logging

csrf = CSRFProtect()


app = Flask(__name__)

app.config.from_object(Config)
csrf.init_app(app)
db = SQLAlchemy(app)
Migrate(app, db)
mail = Mail(app)

def send_email(subject, recipient, body_html=None):
    """
    Sends an email with the given subject and body to the specified recipient.
    Supports both plain text and HTML content.
    """
    try:
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
        return {"status": "success", "message": f"Email sent successfully to {recipient}"}

    except Exception as e:
        logging.error(f"Failed to send email to {recipient}: {str(e)}")
        return {"status": "error", "message": f"Failed to send email to {recipient}: {str(e)}"}

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

    from application.models import User, BlogPost

    with app.app_context():
        db.create_all()

    return app


###########################
#### BLUEPRINT CONFIGS #######
#########################

# Import these at the top if you want
# We've imported them here for easy reference
from application.core.views import core
from application.users.views import users
from application.blog_posts.views import blog_posts
from application.error_pages.handlers import error_pages

# Register the apps
app.register_blueprint(users)
app.register_blueprint(blog_posts)
app.register_blueprint(core)
app.register_blueprint(error_pages)
