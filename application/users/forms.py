# Form Based Imports
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, HiddenField
from wtforms.validators import DataRequired, Email, EqualTo, Length
from wtforms import ValidationError
from flask_wtf.file import FileField, FileAllowed
from application.models import User


class LoginForm(FlaskForm):
    username = StringField(
        "Username", validators=[DataRequired(), Length(min=3, max=25)]
    )
    password = PasswordField("Password", validators=[DataRequired()])
    submit = SubmitField("Login")


class RegistrationForm(FlaskForm):
    email = StringField("Email", validators=[DataRequired(), Email()])
    username = StringField("Username", validators=[DataRequired()])
    password = PasswordField(
        "Password",
        validators=[
            DataRequired(),
            EqualTo("pass_confirm", message="Passwords Must Match!"),
        ],
    )
    pass_confirm = PasswordField("Confirm password", validators=[DataRequired()])
    submit = SubmitField("Register!")

    def check_email(self, field):
        # Check if not None for that user email!
        if User.query.filter_by(email=field.data).first():
            raise ValidationError("Your email has been registered already!")

    def check_username(self, field):
        # Check if not None for that username!
        if User.query.filter_by(username=field.data).first():
            raise ValidationError("Sorry, that username is taken!")


class UpdateUserForm(FlaskForm):
    email = StringField("Email", validators=[DataRequired(), Email()])
    username = StringField("Username", validators=[DataRequired()])
    picture = FileField(
        "Update Profile Picture", validators=[FileAllowed(["jpg", "png"])]
    )
    submit = SubmitField("Update")

    def check_email(self, field):
        # Check if not None for that user email!
        if User.query.filter_by(email=field.data).first():
            raise ValidationError("Your email has been registered already!")

    def check_username(self, field):
        # Check if not None for that username!
        if User.query.filter_by(username=field.data).first():
            raise ValidationError("Sorry, that username is taken!")


class DeleteUserForm(FlaskForm):
    csrf_token = HiddenField()


class SoldierRegistrationForm(FlaskForm):
    full_name = StringField("Họ và Tên", validators=[DataRequired()])
    management_level = StringField("Cấp Quản Lý", validators=[DataRequired()])
    unit_name = StringField("Đơn vị", validators=[DataRequired()])
    submit = SubmitField("Tiếp Theo")


class InputPersonalForm(FlaskForm):
    pass


class RegisterRelativeForm(FlaskForm):
    relative_name = StringField(
        "Họ tên người thân",
        validators=[
            DataRequired(message="Họ tên người thân không được để trống."),
            Length(max=128),
        ],
    )
    relative_id = StringField(
        "Số CCCD",
        validators=[
            DataRequired(message="Số CCCD không được để trống."),
            Length(min=12, max=12, message="Số CCCD phải gồm 12 ký tự."),
        ],
    )
    relationship = StringField("Mối quan hệ", validators=[Length(max=64)])
    rank = StringField("Cấp quản lý Quân nhân", validators=[Length(max=64)])
    unit = StringField("Đơn vị của Quân nhân", validators=[Length(max=128)])
    submit = SubmitField("Đăng ký")
