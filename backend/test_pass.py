import traceback
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

try:
    print(pwd_context.verify('1234', '$2b$12$iPhK9xjKJBSYF95qxrhx..62fPND45CTTaDnWnOau7DXLebUxRWFi'))
except Exception as e:
    traceback.print_exc()
