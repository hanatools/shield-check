

from flask_migrate import Migrate
from application import app, db

migrate = Migrate(app, db)

if __name__ == "__main__":
    if not app.config.get("DEFAULT_USER_EMAIL"):
        raise ValueError(
            "DEFAULT_USER_EMAIL is not set. Please configure it in your environment."
        )
    if not app.config.get("SECRET_KEY"):
        raise ValueError(
            "SECRET_KEY is not set. Please configure it in your environment."
        )
    # app.run(debug=False,  port=5001)
    app.run(debug=False, host="0.0.0.0", port=5001)
    # app.run(debug=True, host="0.0.0.0", port=5001, host='0.0.0.0')
