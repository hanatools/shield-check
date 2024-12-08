import uuid

from application import db, login_manager
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(user_id)


class MilitaryUnit(db.Model):
    __tablename__ = "military_units"

    id = db.Column(db.Integer, primary_key=True)  # Primary Key
    name = db.Column(db.String(255), nullable=False)  # Unit name
    key = db.Column(
        db.String(128), unique=True, nullable=False
    )  # Unique key for the unit
    parent = db.Column(
        db.Integer, db.ForeignKey("military_units.id"), nullable=True
    )  # Parent unit (self-referencing foreign key)
    note = db.Column(db.Text, nullable=True)  # Optional note
    created_date = db.Column(
        db.DateTime, default=datetime.utcnow, nullable=False
    )  # Creation timestamp
    created_by = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )  # User who created the unit

    # Self-referencing relationship for parent units
    parent_unit = db.relationship("MilitaryUnit", remote_side=[id], backref="sub_units")

    def __init__(self, name, key, created_by, **kwargs):
        self.name = name if name else "Default Unit Name"
        self.key = key if key else f"DEFAULT_KEY_{uuid.uuid4().hex[:8].upper()}"
        self.created_by = created_by

        # Set additional fields if provided
        for key, value in kwargs.items():
            setattr(self, key, value)

    def __repr__(self):
        return f"<MilitaryUnit {self.name} - Key: {self.key}>"


class User(db.Model, UserMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    profile_image = db.Column(
        db.String(255), nullable=False, default="default_profile.png"
    )
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(64), unique=True, nullable=True)
    password = db.Column(db.String(500))
    second_level_password = db.Column(db.String(500))
    identity_card = db.Column(db.String(50), unique=True, index=True)
    # Identity card attributes

    full_name = db.Column(db.String(255), nullable=True)
    military_military_manager_id = db.Column(db.String(255), nullable=True)
    military_military_unit_id = db.Column(db.String(255), nullable=True)
    military_military_unit_name = db.Column(db.String(255), nullable=True)
    military_military_manager_full_name = db.Column(db.String(255), nullable=True)
    note = db.Column(db.Text, nullable=True)
    is_manager = db.Column(db.Boolean, default=False, nullable=False)

    # Image paths
    left_image_path = db.Column(db.String(256), nullable=True)
    right_image_path = db.Column(db.String(256), nullable=True)
    front_image_path = db.Column(db.String(256), nullable=True)
    encoding_path = db.Column(db.String(256), nullable=True)
    role = db.Column(db.String(125), default="USER_ROLE", nullable=False)
    reset_token = db.Column(db.String(256), nullable=True)
    reset_second_token = db.Column(db.String(256), nullable=True)

    def __init__(self, email, username, password, **kwargs):
        self.email = email
        self.username = username
        self.password = generate_password_hash(password)

        # Set additional fields if provided
        for key, value in kwargs.items():
            setattr(self, key, value)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def __repr__(self):
        return f"UserName: {self.username} - IdentityCard: {self.identity_card}"


class UserRelative(db.Model):
    __tablename__ = "user_relatives"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(255), nullable=False)
    identity_card = db.Column(db.String(50), nullable=False, index=True)
    relationship = db.Column(db.String(64), nullable=True)
    note = db.Column(db.Text, nullable=True)
    profile_image = db.Column(
        db.String(255), nullable=False, default="default_profile.png"
    )

    # sponsor
    sponsor_id = db.Column(db.String(50), db.ForeignKey("users.id"), nullable=False)
    sponsor_identity_card = db.Column(
        db.String(50), db.ForeignKey("users.identity_card"), nullable=False
    )
    sponsor_full_name = db.Column(db.String(255), nullable=True)
    sponsor_military_management_level = db.Column(db.String(255), nullable=True)
    sponsor_military_military_unit = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    # Relationship with User
    sponsor = db.relationship(
        "User", backref="relatives", foreign_keys=[sponsor_identity_card]
    )

    def __init__(self, full_name, identity_card, **kwargs):
        self.full_name = full_name
        self.identity_card = identity_card

        # Set additional fields if provided
        for key, value in kwargs.items():
            setattr(self, key, value)

    def __repr__(self):
        return f"<UserRelative {self.full_name} - SponsorID: {self.sponsor_id}>"


class CheckIn(db.Model):
    __tablename__ = "check_in"

    id = db.Column(db.Integer, primary_key=True)

    acceptor_level_1_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    acceptor_level_1_full_name = db.Column(db.String(255), nullable=False)
    acceptor_level_2_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    acceptor_level_2_full_name = db.Column(db.String(255), nullable=False)
    acceptor_level_3_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    acceptor_level_3_full_name = db.Column(db.String(255), nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    identity_card = db.Column(db.String(255), nullable=False)

    military_military_manager_id = db.Column(db.String(255), nullable=False)
    military_military_manager_full_name = db.Column(db.String(255), nullable=False)

    file_scan_path = db.Column(db.String(255), nullable=True)
    left_image_path = db.Column(db.String(255), nullable=True)
    right_image_path = db.Column(db.String(255), nullable=True)
    front_image_path = db.Column(db.String(255), nullable=True)
    created_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(50), default="created", nullable=False)
    token = db.Column(
        db.String(255), default=lambda: str(uuid.uuid4()), unique=True, nullable=False
    )
    accepted_datetime = db.Column(db.DateTime, nullable=True)
    check_in_time = db.Column(db.DateTime, nullable=True)
    check_out_time = db.Column(db.DateTime, nullable=True)
    note = db.Column(db.Text, nullable=True)

    def __init__(self, full_name, identity_card, **kwargs):
        self.full_name = full_name
        self.identity_card = identity_card

        # Set additional fields if provided
        for key, value in kwargs.items():
            setattr(self, key, value)

    def __repr__(self):
        return f"<CheckIn {self.id} - {self.full_name}>"


class RelativeCheckIn(db.Model):
    __tablename__ = "relative_check_in"

    id = db.Column(db.Integer, primary_key=True)
    soldier_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )  # Link to the User table

    acceptor_level_1_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    acceptor_level_1_full_name = db.Column(db.String(255), nullable=False)
    acceptor_level_2_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    acceptor_level_2_full_name = db.Column(db.String(255), nullable=False)
    acceptor_level_3_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    acceptor_level_3_full_name = db.Column(db.String(255), nullable=False)

    full_name = db.Column(db.String(255), nullable=False)
    identity_card = db.Column(db.String(255), nullable=False)
    relationship = db.Column(db.String(64), nullable=True)
    note = db.Column(db.Text, nullable=True)
    profile_image = db.Column(
        db.String(255), nullable=False, default="default_profile.png"
    )

    management_level = db.Column(db.String(255), nullable=False)
    unit_name = db.Column(db.String(255), nullable=False)
    file_scan_path = db.Column(db.String(255), nullable=True)
    left_image_path = db.Column(db.String(255), nullable=True)
    right_image_path = db.Column(db.String(255), nullable=True)
    front_image_path = db.Column(db.String(255), nullable=True)
    created_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(
        db.String(50), default="created", nullable=False
    )  # Status: created, accepted, etc.
    token = db.Column(
        db.String(255), default=lambda: str(uuid.uuid4()), unique=True, nullable=False
    )
    accepted_datetime = db.Column(db.DateTime, nullable=True)
    check_in_time = db.Column(db.DateTime, nullable=True)
    check_out_time = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # sponsor
    sponsor_id = db.Column(db.String(50), db.ForeignKey("users.id"), nullable=False)
    sponsor_identity_card = db.Column(
        db.String(50), db.ForeignKey("users.identity_card"), nullable=False
    )
    sponsor_full_name = db.Column(db.String(255), nullable=True)
    sponsor_military_management_level = db.Column(db.String(255), nullable=True)
    sponsor_military_military_unit = db.Column(db.String(255), nullable=True)

    def __init__(self, full_name, identity_card, **kwargs):
        self.full_name = full_name
        self.identity_card = identity_card

        # Set additional fields if provided
        for key, value in kwargs.items():
            setattr(self, key, value)

    def __repr__(self):
        return f"<CheckIn {self.id} - {self.full_name}>"
