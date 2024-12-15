ShieldCheckApp
=====

#### set up
````agsl
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

``````
dang ky nguoi than 1 lan.
sau khi nguoi than dio ra se xoa thong tin nguoi than
nguoi than khong dc duplicate



user: khong co password (Done)
system admin: 
 khong dung password cap 2  (done)

guiwr email: truoc khi gui email => xac nhan internet.
duyet mail => check inetrnet.  => khong cho ibteret tu choi dang ky

1 nguoi phe duyet, 1 nguoi dang ky cho nhieu nguoi.
them  gnuoi phe duyet, them nguoi,  maximun 4 nguoi phe duyet


ten , so cc,  ai la nguoi phe duyet,
email khong cho nhin thay, mau so cioi cua cccd, cccd, 

=== === 
loi dynamic ip trong email neu nhu moi may 1 ip khac nhau, lhong co domain
