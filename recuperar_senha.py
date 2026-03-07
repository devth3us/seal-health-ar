from flask import Blueprint, render_template, request, redirect, url_for, flash
import pymysql
from datetime import datetime, timedelta
import random, string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from werkzeug.security import generate_password_hash
import requests
import os


# nosssa logo esta no site imgur:
# https://i.imgur.com/YqpxefD.jpeg


# Criar o Blueprint
recuperar = Blueprint("recuperar", __name__, url_prefix='/recuperar')

# Configuração do e-mail
EMAIL_USER = "sealhealthsuporte@sealhealth.org"
EMAIL_PASS = "Math8080@" 

# Função para conectar ao banco 
def get_db_config():
    return {
    'host': os.environ.get('DB_HOST'),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'database': os.environ.get('DB_NAME'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
    }



# Rota: página de recuperar senha
@recuperar.route("/esqueci_senha")
def esqueci_senha():
    return render_template("esqueci_senha.html")



# teste doido

@recuperar.route("/enviar_codigo", methods=["POST"])
def enviar_codigo():
    email = request.form.get("email")

    if not email:
        flash("Por favor, forneça um endereço de e-mail.")
        return redirect(url_for(".esqueci_senha"))

    try:
        print(f"Recebido e-mail: {email}")

        # Conectar ao banco
        with pymysql.connect(**get_db_config()) as conn:
            with conn.cursor() as cursor:
                # Verificar se o e-mail está cadastrado
                cursor.execute("select cpf, nome from pessoa where email=%s", (email,))
                user = cursor.fetchone()

                if not user:
                    flash("E-mail não encontrado.")
                    return redirect(url_for("recuperar.esqueci_senha"))

                print(f"Usuário encontrado: {user['nome']}")

                # Gerar código e expiração
                codigo = ''.join(random.choices(string.digits, k=6))
                expiracao = datetime.now() + timedelta(minutes=15)

                # Limpar códigos antigos
                cursor.execute("delete from Db_Cod_rec where cpf_pessoa=%s", (user["cpf"],))

                # Inserir novo código
                cursor.execute("""
                    insert into Db_Cod_rec (cpf_pessoa, codigo, expiracao, usado)
                    values (%s, %s, %s, %s)
                """, (user["cpf"], codigo, expiracao, 0))
                conn.commit()

                # Link ajustado para HTTPS oficial do projeto
                reset_link = f"https://www.sealhealth.org/redefinir_senha_temp?token={codigo}&cpf={user['cpf']}"

                html = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body {{
      background-color: #f4f4f4;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
    }}
    .container {{
      background-color: #ffffff;
      max-width: 600px;
      margin: 40px auto;
      border-radius: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }}
    .header {{
      background-color: #0077b6;
      text-align: center;
      padding: 30px 20px;
    }}
    .header img {{
      width: 120px;
      border-radius: 50%;
    }}
    .content {{
      padding: 30px;
      text-align: center;
      color: #333333;
    }}
    h2 {{
      color: #0077b6;
      margin: 8px 0 16px 0;
    }}
    p {{
      font-size: 16px;
      line-height: 1.6;
      margin: 8px 0;
    }}
    .code {{
      font-size: 22px;
      letter-spacing: 3px;
      background-color: #e3f2fd;
      color: #023e8a;
      padding: 10px 20px;
      border-radius: 8px;
      display: inline-block;
      font-weight: bold;
      margin: 15px 0;
    }}
    .button {{
      display: inline-block;
      background-color: #0096c7;
      color: white;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: bold;
      margin-top: 20px;
      transition: background-color 0.3s;
    }}
    .button:hover {{
      background-color: #023e8a;
    }}
    .footer {{
      background-color: #f1f1f1;
      text-align: center;
      padding: 15px;
      font-size: 14px;
      color: #777;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://i.imgur.com/YqpxefD.jpeg" alt="Seal Health Logo">
    </div>
    <div class="content">
      <h2>Redefinir Senha</h2>
      <p>Olá <strong>{user['nome']}</strong>,</p>
      <p>Recebemos uma solicitação para redefinir a sua senha na <strong>Seal Health</strong>.</p>

      <p>Use o código abaixo para confirmar sua identidade:</p>
      <div class="code">{codigo}</div>

      <p>Ou, se preferir, clique no botão abaixo para redefinir diretamente sua senha:</p>
      <a href="{reset_link}" class="button">Redefinir Senha</a>

      <p style="margin-top:20px; font-size:13px; color:#666;">
        Este código expira em 15 minutos. Se você não solicitou esta ação, ignore este e-mail.
      </p>
    </div>
    <div class="footer">
      © 2025 Seal Health — Facilitando seu dia 🦭
    </div>
  </div>
</body>
</html>
"""

                url = "https://api.brevo.com/v3/smtp/email"
                
                headers = {
                    "accept": "application/json",
                    "api-key": os.environ.get("CHAVE_RESEND"), 
                    "content-type": "application/json"
                }
                
                payload = {
                    "sender": {"name": "Suporte Seal Health", "email": "sealhealthsuporte@sealhealth.org"},
                    "to": [{"email": email, "name": user['nome']}],
                    "subject": "Recuperação de Senha - Seal Health",
                    "htmlContent": html
                }
                
                # Fazendo a requisição web para a API
                resposta = requests.post(url, json=payload, headers=headers)
                
                if resposta.status_code in [200, 201, 202]:
                    print("Código enviado via API com sucesso!")
                    flash("E-mail de redefinição enviado! Verifique sua caixa de entrada.")
                    return redirect(url_for("recuperar.verificar_codigo", cpf=user["cpf"]))
                else:
                    print(f"Erro na API: {resposta.status_code} - {resposta.text}")
                    flash("Erro no servidor de e-mail. Tente novamente mais tarde.")
                    return redirect(url_for(".esqueci_senha"))

    except Exception as e:
        print("Erro interno ao enviar código:", e)
        flash("Erro ao processar a solicitação. Tente novamente.")
        return redirect(url_for(".esqueci_senha"))



@recuperar.route("/redefinir_senha_temp")
def redefinir_senha_temp():
    token = request.args.get("token")
    cpf = request.args.get("cpf")

    if not token or not cpf:
        return "<h3>Link inválido.</h3>"

    try:
        with pymysql.connect(**get_db_config()) as conn:
            with conn.cursor() as cursor:
                # Verificar se o código existe e se não foi usado
                cursor.execute("""
                    select * from Db_Cod_rec
                    where cpf_pessoa=%s and codigo=%s and usado=0
                """, (cpf, token))
                record = cursor.fetchone()

                if not record:
                    return "<h3>Link inválido ou já utilizado.</h3>"

                # Verificar se o código expirou
                if datetime.now() > record["expiracao"]:
                    return "<h3>Este link expirou.</h3>"

                # Tudo certo. entao ir para a página de redefinir senha
                return redirect(url_for("recuperar.redefinir_senha", cpf=cpf))

    except Exception as e:
        print("Erro ao validar token:", e)
        return "<h3>Erro interno no servidor.</h3>"



# Página para verificar o código
@recuperar.route("/verificar_codigo/<cpf>")
def verificar_codigo(cpf):
    return render_template("verificar_codigo.html", cpf=cpf)

@recuperar.route("/validar_codigo", methods=["POST"])
def validar_codigo():
    cpf = request.form.get("cpf")
    codigo = request.form.get("codigo")

    try:
        with pymysql.connect(**get_db_config()) as conn:
            with conn.cursor() as cursor:
                print(f"Validando código para o CPF {cpf} com código {codigo}")

                # Verificar se o código está correto e não foi usado
                cursor.execute("""
                    select * from Db_Cod_rec
                    where cpf_pessoa=%s AND codigo=%s AND usado=0
                """, (cpf, codigo))
                record = cursor.fetchone()

                if not record:
                    print(f"Código inválido ou já utilizado para o CPF {cpf}.")
                    flash("Código inválido ou já utilizado.")
                    return redirect(url_for("recuperar.verificar_codigo", cpf=cpf))

                # Verificar se o código expirou
                if datetime.now() > record["expiracao"]:
                    print(f"Código expirado para o CPF {cpf}.")
                    flash("Código expirado.")
                    # Limpar código expirado
                    cursor.execute("delete from Db_Cod_rec where id=%s", (record["id"],))
                    conn.commit()
                    return redirect(url_for(".esqueci_senha"))

                # Marcar o código como usado
                cursor.execute("update Db_Cod_rec set usado=1 where id=%s", (record["id"],))
                conn.commit()
                print(f"Código válido, redirecionando para a redefinição de senha para o CPF {cpf}.")

                # Código válido entao ir para redefinir senha
                return redirect(url_for("recuperar.redefinir_senha", cpf=cpf))

    except Exception as e:
        print("Erro ao validar código:", e)
        flash("Erro interno.")
        return redirect(url_for("recuperar.esqueci_senha"))



# Redefinir senha
@recuperar.route("/redefinir_senha/<cpf>")
def redefinir_senha(cpf):
    return render_template("redefinir_senha.html", cpf=cpf)



@recuperar.route("/salvar_nova_senha", methods=["POST"])
def salvar_nova_senha():
    cpf = request.form.get("cpf")
    nova_senha = request.form.get("senha")

    if not nova_senha:
        flash("A senha não pode estar vazia.")
        return redirect(url_for("recuperar.redefinir_senha", cpf=cpf))

    senha_hash = generate_password_hash(nova_senha)

    try:
        with pymysql.connect(**get_db_config()) as conn:
            with conn.cursor() as cursor:
                # Atualizar a senha no banco
                cursor.execute("update pessoa set senha=%s where cpf=%s", (senha_hash, cpf))

                # Limpar o código de recuperação após a redefinição
                cursor.execute("delete from Db_Cod_rec where cpf_pessoa=%s", (cpf,))
                conn.commit()

        flash("Senha alterada com sucesso!")
        return redirect(url_for("login_usuario"))  # Voltar para o login

    except Exception as e:
        print("Erro ao redefinir senha:", e)
        flash("Erro ao alterar senha.")
        return redirect(url_for("recuperar.esqueci_senha"))
