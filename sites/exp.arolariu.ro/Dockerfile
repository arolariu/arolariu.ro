FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=80

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN addgroup --system app && adduser --system --ingroup app app && chown -R app:app /app

USER app

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:80/api/health', timeout=3)"

CMD ["uvicorn", "function_app:app", "--host", "0.0.0.0", "--port", "80", "--workers", "1"]
