from flask import Blueprint, current_app
import os
import requests

email_bp = Blueprint("email_bp", __name__)

def enviar_notificacao_atestado(nome_usuario, destinatario_email, nome_arquivo):
    with current_app.app_context():
        try:
            # 1. Puxa a chave do cofre do Render
            chave_api = os.environ.get("CHAVE_RESEND")
            
            if not chave_api:
                print(" ERRO: Variável CHAVE_RESEND não encontrada no Render.")
                return False

            html_content = f"""
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
                .button {{
                display: inline-block;
                background-color: #0096c7;
                color: #fff;
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
                .aaa{{
                    color: #fff;
                }}
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="https://i.imgur.com/YqpxefD.jpeg" alt="Seal Health Logo">
                </div>
                <div class="content">
                  <h2>Notificação de Atestado</h2>
                  <p>Olá <strong>Responsável</strong>,</p>
                  <p>Um novo atestado foi enviado por <strong>{nome_usuario}</strong>.</p>
                  <p><strong>Arquivo:</strong> {nome_arquivo}</p>

                  <p style="margin-top: 20px; color: #000000 " class="aaa">Clique no botão abaixo para acessar o sistema e validar o documento:</p>
                  <a style="color: white;" href="https://sealhealth.org" class="button">Ir para o Sistema</a>

                  <p style="margin-top:20px; font-size:13px; color:#666;">
                    Essa é uma mensagem automática. Por favor, não responda este e-mail.
                  </p>
                </div>
                <div class="footer">
                  © 2025 Seal Health — Facilitando seu dia 🦭
                </div>
              </div>
            </body>
            </html>
            """

            # 2. Configura a comunicação com a API da Resend
            url = "https://api.resend.com/emails"
            headers = {
                "Authorization": f"Bearer {chave_api}",
                "Content-Type": "application/json"
            }

            # 3. Monta o pacote de dados do e-mail
            payload = {
                "from": "Seal Health <onboarding@resend.dev>", # Exigência da Resend para contas grátis
                "to": [destinatario_email], 
                "subject": f"NOVO ATESTADO RECEBIDO: {nome_usuario}",
                "html": html_content
            }

            # 4. Dispara o e-mail pela porta 443
            resposta = requests.post(url, json=payload, headers=headers)

            if resposta.status_code in [200, 201]:
                print(" E-mail de notificação enviado com sucesso via Resend!")
                return True
            else:
                print(f" ERRO NA API RESEND: {resposta.status_code} - {resposta.text}")
                return False

        except Exception as e:
            print(f" ERRO CRÍTICO AO ENVIAR E-MAIL DE NOTIFICAÇÃO: {e}")
            return False