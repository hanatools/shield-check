ShieldCheckApp
=====

#### set up
````agsl
python --version
3.11.7
python -m venv app_venv
.\app_venv\Scripts\activate (Windows)
source ./app_venv/bin/activate
deactivate
rm -rf app_venv
brew install libffi


pip install cffi==1.15.1
````

#### run app
```agsl
python app.py
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
python create_default_user.py
flask db downgrade base
```

### Format code
```angular2html
pip install black
black .
```

### Set up deploy and test
```angular2html
1.rest database
rm -rf shield_check_db.sqlite


2. set up enviroment
python -m venv app_venv
.\app_venv\Scripts\activate (Windows)
source ./app_venv/bin/activate
pip install -r requirements.txt

3. set up config
source ./set_env_variables.sh
test: 
echo $DEFAULT_USER_EMAIL  # require not empty

4. set up database
flask db upgrade
python create_default_user.py

5. run cronjob
python EmailPolling.py

6. run web server
python app.py
```

### Link setup docuemnt
```angular2html
https://drive.google.com/drive/folders/1Qt-vd113VXk6uT_R9Ckik_BczXiANsOY
```