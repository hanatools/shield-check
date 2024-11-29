import os


class Config:
    SECRET_KEY = os.environ.get(
        "SECRET_KEY", "ViF0WedRl7IsplhEcrlhoStucHu7aX6craSejlproM4hIH8jIs5UPa9E4eFre2he"
    )
    basedir = os.path.abspath(os.path.dirname(__file__))
    # SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'shield_check_db.sqlite')
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(
        os.path.dirname(basedir), "shield_check_db.sqlite"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Dafault user
    DEFAULT_USER_EMAIL = os.getenv(
        "DEFAULT_USER_EMAIL", "mr.william.technician1988@gmail.com"
    )
    DEFAULT_USERNAME = os.getenv("DEFAULT_USERNAME", "admin")
    DEFAULT_USER_PASSWORD = os.getenv("DEFAULT_USER_PASSWORD", "123456")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "static/uploads")
    FACE_DATA = os.getenv("FACE_DATA", "static/face_data")

