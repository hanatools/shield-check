from application import create_app, db
from application.models import User
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    # Check if the user already exists
    if not User.query.filter_by(email=app.config["DEFAULT_USER_EMAIL"]).first():
        # Create a new user
        default_user = User(
            email=app.config["DEFAULT_USER_EMAIL"],
            username=app.config["DEFAULT_USERNAME"],
            password=app.config["DEFAULT_USER_PASSWORD"],
            identity_card=f"000000000000",
        )
        # Add the user to the session and commit
        db.session.add(default_user)
        db.session.commit()
        print("Default user created.")
