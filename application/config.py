import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "")
    basedir = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = (
        "sqlite:///"
        + os.path.join(os.path.dirname(basedir), "shield_check_db.sqlite")
        + "?charset=utf8"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Default user email
    DEFAULT_USER_EMAIL = os.getenv("DEFAULT_USER_EMAIL", "")
    DEFAULT_USER_PASSWORD = os.getenv("DEFAULT_USER_PASSWORD", "123456")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "static/uploads")
    UPLOAD_FOLDER_ABSOLUTE_PATH = os.path.join(
        os.path.dirname(__file__).split("application")[0], UPLOAD_FOLDER
    )
    FACE_DATA = os.getenv("FACE_DATA", "static/face_data")

    # Flask-Mail Configuration
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "false").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", "")
