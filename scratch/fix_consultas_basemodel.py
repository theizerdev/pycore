with open('backend/app/api/v1/consultas.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = 'from fastapi import APIRouter, Depends, HTTPException, Query, status'
replacement = 'from fastapi import APIRouter, Depends, HTTPException, Query, status\nfrom pydantic import BaseModel, Field'

if target in text:
    text = text.replace(target, replacement)
elif target.replace('\n', '\r\n') in text:
    text = text.replace(target.replace('\n', '\r\n'), replacement.replace('\n', '\r\n'))

with open('backend/app/api/v1/consultas.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("BaseModel added to consultas.py")

