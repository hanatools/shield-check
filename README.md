ShieldCheckApp
=====

#### set up
````agsl
python -m venv app_venv
.\app_venv\Scripts\activate (Windows)
source ./app_venv/bin/activate (Max/Linux)
deactivate
rm -rf app_venv
brew install libffi


pip install cffi==1.15.1
````

#### run app
```agsl
python app.py
=> 
```

### Database
```angular2html
pip install Flask-Migrate
# Mac/linux
export FLASK_APP=app.py
# Windows
set FLASK_APP=app.py
flask db init
flask db migrate -m "Initial database."
flask db upgrade
```