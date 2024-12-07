from application import create_app, db
from application.models import User
from werkzeug.security import generate_password_hash

app = create_app()

# with app.app_context():
#     # Check if the user already exists
#     if not User.query.filter_by(email=app.config["DEFAULT_USER_EMAIL"]).first():
#         # Create a new user
#         default_user = User(
#             email=app.config["DEFAULT_USER_EMAIL"],
#             username=app.config["DEFAULT_USERNAME"],
#             password=app.config["DEFAULT_USER_PASSWORD"],
#             identity_card="000000000000",
#             full_name="Default Admin",
#             military_military_manager_id="Default Admin",
#             military_military_unit="Default Unit",
#             military_military_manager_full_name="Default Manager",
#             note="This is the default admin user created during initialization.",
#             role="SYSTEM_ADMIN_ROLE",
#             is_manager=False,
#         )
#         # Add the user to the session and commit
#         db.session.add(default_user)
#         manager_user = User(
#             email=app.config["DEFAULT_USER_EMAIL"],
#             username=app.config["DEFAULT_USERNAME"],
#             password=app.config["DEFAULT_USER_PASSWORD"],
#             identity_card="000000000000",
#             full_name="Default Admin",
#             military_military_manager_id="Default Admin",
#             military_military_unit="Default Unit",
#             military_military_manager_full_name="Default Manager",
#             note="This is the default admin user created during initialization.",
#             role="ADMIN_ROLE",
#             is_manager=True,
#         )
#         # Add the second user to the session
#         db.session.add(manager_user)
#
#         # Commit both users to the database
#         db.session.commit()
#         print("Default users created.")
with app.app_context():
    # Check if there are no users in the database
    if User.query.count() == 0:
        # Create the first user (non-manager)
        non_manager_user = User(
            email=app.config["DEFAULT_USER_EMAIL"],
            username=app.config["DEFAULT_USERNAME"],
            password=app.config["DEFAULT_USER_PASSWORD"],
            identity_card="000000000000",
            full_name="Default Admin",
            military_military_manager_id="Default Admin",
            military_military_unit="Default Unit",
            military_military_manager_full_name="Default Manager",
            note="Đây là người dùng quản trị mặc định được tạo trong quá trình khởi tạo.",
            role="SYSTEM_ADMIN_ROLE",
            is_manager=False,
        )
        db.session.add(non_manager_user)

        # Create the second user (manager)
        manager_user = User(
            email=app.config["DEFAULT_MANAGER_EMAIL"],
            username=app.config["DEFAULT_MANAGER_USERNAME"],
            password=app.config["DEFAULT_USER_PASSWORD"],
            identity_card="111111111111",
            full_name="Thủ trưởng",
            military_military_manager_id="",
            military_military_unit="",
            military_military_manager_full_name="",
            note="Tài khoản măc định của thủ trưởng",
            role="ADMIN_ROLE",
            is_manager=True,
        )
        db.session.add(manager_user)

        # Commit both users to the database
        db.session.commit()
        print("Default users created.")