import uuid

from application import db, login_manager
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(user_id)


class User(db.Model, UserMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    profile_image = db.Column(
        db.String(20), nullable=False, default="default_profile.png"
    )
    email = db.Column(db.String(64), unique=True, nullable=False)
    username = db.Column(db.String(64), unique=True, nullable=True)
    password_hash = db.Column(db.String(128))
    identity_card = db.Column(db.String(12), unique=True, index=True)
    # Identity card attributes

    full_name = db.Column(db.String(128), nullable=True)
    management_level = db.Column(db.String(64), nullable=True)
    unit_name = db.Column(db.String(128), nullable=True)

    # Image paths
    left_image_path = db.Column(db.String(256), nullable=True)
    right_image_path = db.Column(db.String(256), nullable=True)
    front_image_path = db.Column(db.String(256), nullable=True)
    encoding_path = db.Column(db.String(256), nullable=True)

    def __init__(self, email, username, password, **kwargs):
        self.email = email
        self.username = username
        self.password_hash = generate_password_hash(password)

        # Set additional fields if provided
        for key, value in kwargs.items():
            setattr(self, key, value)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"UserName: {self.username} - IdentityCard: {self.identity_card}"

class BlogPost(db.Model):
    # Setup the relationship to the User table
    users = db.relationship(User)

    # Model for the Blog Posts on Website
    id = db.Column(db.Integer, primary_key=True)
    # Notice how we connect the BlogPost to a particular author
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    title = db.Column(db.String(140), nullable=False)
    text = db.Column(db.Text, nullable=False)

    def __init__(self, title, text, user_id):
        self.title = title
        self.text = text
        self.user_id = user_id

    def __repr__(self):
        return f"Post Id: {self.id} --- Date: {self.date} --- Title: {self.title}"

class CheckIn(db.Model):
    __tablename__ = "check_in"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Link to the User table
    acceptor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    full_name = db.Column(db.String(255), nullable=False)
    identity_card = db.Column(db.String(255), nullable=False)
    management_level = db.Column(db.String(255), nullable=False)
    unit_name = db.Column(db.String(255), nullable=False)
    file_scan_path = db.Column(db.String(255), nullable=True)
    left_image_path = db.Column(db.String(255), nullable=True)
    right_image_path = db.Column(db.String(255), nullable=True)
    front_image_path = db.Column(db.String(255), nullable=True)
    created_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(50), default="created", nullable=False)  # Status: created, accepted, etc.
    token = db.Column(db.String(255), default=lambda: str(uuid.uuid4()), unique=True, nullable=False)
    accepted_datetime = db.Column(db.DateTime, nullable=True)
    check_in_time = db.Column(db.DateTime, nullable=True)
    check_out_time = db.Column(db.DateTime, nullable=True)

    def __repr__(self):
        return f"<CheckIn {self.id} - {self.full_name}>"