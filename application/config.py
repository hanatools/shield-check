import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'ViF0WedRl7IsplhEcrlhoStucHu7aX6craSejlproM4hIH8jIs5UPa9E4eFre2he')
    basedir = os.path.abspath(os.path.dirname(__file__))
    # SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'shield_check_db.sqlite')
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(os.path.dirname(basedir), 'shield_check_db.sqlite')
    SQLALCHEMY_TRACK_MODIFICATIONS = False