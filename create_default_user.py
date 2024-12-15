from application import create_app, db
from application.models import User

app = create_app()

with app.app_context():
    if not app.config.get("DEFAULT_USER_EMAIL"):
        raise ValueError(
            "DEFAULT_USER_EMAIL is not set. Please configure it in your environment."
        )
    if not app.config.get("SECRET_KEY"):
        raise ValueError(
            "SECRET_KEY is not set. Please configure it in your environment."
        )

    # Check if there are no users in the database
    if User.query.count() == 0:
        # Create the first user (non-manager)
        non_manager_user = User(
            email=app.config["DEFAULT_USER_EMAIL"],
            username="administrator",
            password=app.config["DEFAULT_USER_PASSWORD"],
            second_level_password=app.config["DEFAULT_USER_PASSWORD"],
            identity_card="000000000000",
            full_name="Default Admin",
            military_manager_id="",
            military_manager_full_name="",
            note="Đây là người dùng quản trị mặc định được tạo trong quá trình khởi tạo.",
            role="SYSTEM_ADMIN_ROLE",
            is_manager=False,
        )
        db.session.add(non_manager_user)

        db.session.commit()
        print("Default users created.")
