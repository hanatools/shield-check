from application import db, login_manager
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

# By inheriting the UserMixin we get access to a lot of built-in attributes
# which we will be able to call in our views!
# is_authenticated()
# is_active()
# is_anonymous()
# get_id()


# The user_loader decorator allows flask-login to load the current user
# and grab their id.


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(user_id)


class User(db.Model, UserMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    profile_image = db.Column(
        db.String(20), nullable=False, default="default_profile.png"
    )
    email = db.Column(db.String(64), unique=True, index=True)
    username = db.Column(db.String(64), unique=True, index=True)
    password_hash = db.Column(db.String(128))

    # Identity card attributes
    identity_card = db.Column(db.String(12), unique=True, nullable=False)
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
