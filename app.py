# Instruções para rodar o projeto
# Sealhealth.email@gmail.com
# pip install Flask
# pip install pymysql
# pip install requests (Necessário para a Brevo/Resend)
# pip install python-dotenv

from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import os
import pymysql
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import json
import string
import random
import requests
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env (tanto local quanto no Render via Secret Files)
load_dotenv()

# Importa os Blueprints
from recuperar_senha import recuperar  
from email_bp import email_bp, enviar_notificacao_atestado 

app = Flask(__name__)
app.secret_key = "seal_health"


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 3 * 1024 * 1024 
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf"}


db_config = {
    'host': os.environ.get('DB_HOST'),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'database': os.environ.get('DB_NAME'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}


app.register_blueprint(email_bp)
app.register_blueprint(recuperar)


@app.errorhandler(413)
def request_entity_too_large(error):
    flash("O arquivo enviado é muito grande. O limite é 3 MB.")
    return redirect(request.url)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def verificar_usuario(email, senha):
    try:
        with pymysql.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                cursor.execute("select * from pessoa where email=%s", (email,))
                user = cursor.fetchone()
                if user and check_password_hash(user["senha"], senha):
                    return user
    except Exception as e:
        print("Erro ao verificar usuário:", e)
    return None


@app.route("/")
def escolha():
    return render_template("escolha.html")

@app.route("/esqueci_senha")
def esqueci_senha():
    return render_template("esqueci_senha.html")

@app.route("/login_usuario")
def login_usuario():
    return render_template("index.html")

@app.route("/auth_usuario", methods=["POST"])
def auth_usuario():
    email = request.form.get("email", "").strip()
    senha = request.form.get("senha", "").strip()

    user = verificar_usuario(email, senha)
    if user and user["tipo"] == "US":
        session["usuario"] = user
        flash("Login efetuado com sucesso!", "success") 
        return redirect(url_for("layout"))
    else:
        flash("E-mail ou senha incorretos.", "error") 
        return redirect(url_for("login_usuario"))

@app.route("/login_admin")
def login_admin():
    return render_template("login_admin.html")

@app.route("/auth_admin", methods=["POST"])
def auth_admin():
    email = request.form.get("email", "").strip()
    senha = request.form.get("senha", "").strip()

    admin = verificar_usuario(email, senha)
    if admin and admin["tipo"] == "ADM":
        session["admin"] = admin
        flash("Login administrativo realizado!", "success")
        return redirect(url_for("dashboard_admin"))
    else:
        flash("Credenciais de administrador inválidas.", "error")
        return redirect(url_for("login_admin"))

@app.route("/layout")
def layout():
    if "usuario" not in session:
        return redirect(url_for("login_usuario"))
    
    user = session["usuario"]
    atestados = []

    try:
        with pymysql.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    select descricao, id, caminho, 
                    DATE_FORMAT(data_envio, '%%d/%%m/%%Y') as data_bonita 
                    from atestado 
                    where cpf = %s 
                    order by data_envio DESC
                """, (user['cpf'],))
                atestados = cursor.fetchall()
    except Exception as e:
        print("Erro ao buscar atestados do usuário:", e)

    return render_template(
        "layout.html", 
        user=user, 
        user_name=user['nome'].split()[0], 
        atestados=atestados
    )

@app.route("/dashboard_admin")
def dashboard_admin():
    if "admin" not in session:
        return redirect(url_for("login_admin"))
    
    kpis = {}
    conn = None 
    
    try:
        conn = pymysql.connect(**db_config)
        with conn.cursor() as cursor:
            cursor.execute("select count(*) as total from atestado")
            kpis['total_atestados'] = cursor.fetchone().get('total', 0)
            
            cursor.execute("select count(*) as pendentes from atestado where id= 0") 
            kpis['atestados_pendentes'] = cursor.fetchone().get('pendentes', 0)
            
    except pymysql.Error as e:
        print("Erro específico do MySQL:", e)
        flash("Erro ao conectar ou consultar o banco de dados. Verifique a conexão.")
        kpis['total_atestados'] = 'ERRO DE DB'
        kpis['atestados_pendentes'] = 'ERRO DE DB'
    except OSError as e:
        print("Erro de Rede/SO:", e)
        flash("Falha de rede. Servidor de DB inacessível (Argumento Inválido).")
        kpis['total_atestados'] = 'ERRO DE REDE'
        kpis['atestados_pendentes'] = 'ERRO DE REDE'
    except Exception as e:
        print("Erro genérico ao obter KPIs:", e)
        flash("Erro interno ao carregar o painel.")
        kpis['total_atestados'] = 'ERRO'
        kpis['atestados_pendentes'] = 'ERRO'
    finally:
        if conn:
            conn.close()

    return render_template("dashboard_admin.html", user=session["admin"], kpis=kpis)

@app.route("/admin/gestao_atestados")
def admin_gestao_atestados():
    if "admin" not in session:
        return redirect(url_for("login_admin"))
        
    try:
        with pymysql.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    select
                        a.id, a.descricao, a.cpf, a.caminho, a.id, 
                        DATE_FORMAT(a.data_envio, '%Y/%m/%d %H:%i') as data_envio_formatada,
                        p.nome, p.email
                    from atestado a
                    join pessoa p on a.cpf = p.cpf
                    order by a.data_envio DESC
                """)
                atestados = cursor.fetchall()
    except Exception as e:
        print("Erro ao listar atestados:", e)
        atestados = []

    return render_template("admin_gestao_atestados.html", atestados=atestados)

@app.route("/admin/cadastro_usuarios")
def admin_cadastro_usuarios():
    if "admin" not in session:
        return redirect(url_for("login_admin"))
    return render_template("admin_cadastro_usuarios.html", is_admin_context=True)

@app.route("/api/update_atestado", methods=["POST"])
def api_update_atestado():
    if "admin" not in session:
        return jsonify({"success": False, "message": "Não autorizado"}), 401

    data = request.get_json()
    atestado_id = data.get('id')
    novo_status = data.get('status') 

    if not atestado_id or novo_status is None:
        return jsonify({"success": False, "message": "Dados inválidos"}), 400

    try:
        with pymysql.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "update atestado set status = %s where id = %s", 
                    (novo_status, atestado_id)
                )
                conn.commit()
        return jsonify({"success": True, "message": "Status atualizado com sucesso"})
    except Exception as e:
        print("Erro ao atualizar status do atestado:", e)
        return jsonify({"success": False, "message": "Erro interno do servidor"}), 500

@app.route("/cadastro")
def cadastro():
    return render_template("cadastro.html")

@app.route("/register", methods=["POST"])
def register():
    try:
        cpf = request.form.get("cpf")
        nome = request.form.get("nome")
        email = request.form.get("email")
        dt_nasc = request.form.get("dt_nasc")
        cep = request.form.get("cep", "").replace('-', '') 
        num_ende = request.form.get("num_ende")
        complemento = request.form.get("complemento_ende")
        tell = request.form.get("tell")
        senha = request.form.get("senha")
        tipo = request.form.get("tipo")

        senha_hash = generate_password_hash(senha)

        with pymysql.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    insert into pessoa 
                    (cpf, nome, email, senha, dt_nasc, cep, num_ende, complemento_ende, tell, tipo)
                    values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (cpf, nome, email, senha_hash, dt_nasc, cep, num_ende, complemento, tell, tipo))
                conn.commit()

        flash("registered")
        return redirect(url_for("login_usuario"))
    except Exception as e:
        print("Erro no cadastro:", e)
        flash("register_error")
        return redirect(url_for("cadastro"))


@app.route("/admin/enviar_convite", methods=["POST"])
def enviar_convite():
    if "admin" not in session:
        flash("Sessão expirada. Faça login novamente.", "error")
        return redirect(url_for("login_admin"))

    cpf = request.form.get("cpf")
    nome = request.form.get("nome")
    email = request.form.get("email")
    tipo = request.form.get("tipo")

    senha_temp = ''.join(random.choices(string.ascii_letters + string.digits, k=6))
    senha_hash = generate_password_hash(senha_temp)

    try:
        with pymysql.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                cursor.execute("select cpf from pessoa where cpf=%s", (cpf,))
                if cursor.fetchone():
                    flash("Este CPF já está cadastrado no sistema.", "error")
                    return redirect(url_for("admin_cadastro_usuarios"))

                cursor.execute("""
                    insert into pessoa 
                    (cpf, nome, email, senha, dt_nasc, cep, num_ende, complemento_ende, tell, tipo)
                    values (%s, %s, %s, %s, '2000-01-01', '', '', '', '', %s)
                """, (cpf, nome, email, senha_hash, tipo))
                conn.commit()

        
        html_email = f"""
        <div style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 30px;">
            <div style="background: white; max-width: 500px; margin: auto; padding: 30px; border-radius: 10px; border-top: 5px solid #007b8f; text-align: center;">
                <h2 style="color: #007b8f;">Bem-vindo ao Seal Health!</h2>
                <p>Olá <strong>{nome}</strong>, você foi convidado pela administração para acessar nosso sistema.</p>
                <p>Seus dados de acesso temporários são:</p>
                <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; font-size: 18px; margin: 20px 0; font-weight: bold; color: #333;">
                    E-mail: {email}<br>
                    Senha provisória: {senha_temp}
                </div>
                <p>Recomendamos que você acesse o sistema e faça a redefinição da sua senha e complete seu perfil o mais rápido possível.</p>
                <a href="https://sealhealth.org" style="display: inline-block; background: #007b8f; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px;">Acessar o Sistema</a>
            </div>
        </div>
        """

        chave_api = os.environ.get("BREVO_API_KEY")
        
        url_brevo = "https://api.brevo.com/v3/smtp/email"
        
        headers = {
            "accept": "application/json",
            "api-key": chave_api,
            "content-type": "application/json"
        }
        
        payload = {
            "sender": {"name": "Seal Health", "email": "sealhealth.email@gmail.com"},
            "to": [{"email": email, "name": nome}],
            "subject": "Você foi convidado! - Seal Health",
            "htmlContent": html_email
        }
        
        # Envia a requisição HTTPS para a Brevo
        resposta = requests.post(url_brevo, json=payload, headers=headers)

        # Checa se a Brevo aceitou o envio
        if resposta.status_code in [200, 201, 202]:
            flash("Convite enviado com sucesso! O usuário já pode acessar o sistema.", "success")
        else:
            print(f" ERRO BREVO: {resposta.status_code} - {resposta.text}")
            flash("Usuário cadastrado no banco, mas a Brevo bloqueou o e-mail. Verifique a chave da API no Render.", "error")

        return redirect(url_for("admin_cadastro_usuarios"))

    except Exception as e:
        print("Erro ao cadastrar convite:", e)
        flash("Erro interno ao processar o cadastro.", "error")
        return redirect(url_for("admin_cadastro_usuarios"))


@app.route("/admin/usuarios")
def admin_usuarios():
    if "admin" not in session:
        return redirect(url_for("login_admin"))
    return render_template("cadastro.html")

@app.route("/admin/base")
def admin_base():
    if "admin" not in session:
        return redirect(url_for("login_admin"))
    return render_template("base.html")

@app.route("/admin/busca")
def admin_busca():
    if "admin" not in session:
        return redirect(url_for("login_admin"))
    return render_template("busca.html")

@app.route("/base")
def base():
    return render_template("base.html")

@app.route("/busca")
def busca():
    return render_template("busca.html")


@app.route("/upload", methods=["POST"])
def upload_file():
    if "usuario" not in session:
        flash("Sua sessão expirou. Faça login novamente.", "error")
        return redirect(url_for("login_usuario"))  

    cpf = request.form.get("cpf")
    descricao = request.form.get("descricao")
    file = request.files.get("file")

    EMAIL_DO_RESPONSAVEL = "sealhealth.email@gmail.com"

    try:
        with pymysql.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                cursor.execute("select cpf, nome from pessoa where cpf = %s", (cpf,))
                pessoa_info = cursor.fetchone()

                if not pessoa_info:
                    flash("CPF não encontrado no sistema.", "error")
                    return redirect(url_for("layout"))

                primeiro_nome = pessoa_info["nome"].split()[0]

                if file and allowed_file(file.filename):
                    ext = file.filename.rsplit(".", 1)[1].lower()
                    data_hora = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
                    filename = f"{primeiro_nome}_{data_hora}.{ext}"

                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(filepath)

                    cursor.execute(""" 
                        insert into atestado (descricao, cpf, caminho, status) 
                        values (%s, %s, %s, '0')
                    """, (descricao, cpf, filepath))
                    conn.commit()

                    enviar_notificacao_atestado(
                        nome_usuario=pessoa_info["nome"],
                        destinatario_email=EMAIL_DO_RESPONSAVEL,
                        nome_arquivo=filename
                    )

                    flash("Atestado enviado com sucesso!", "success")
                    return redirect(url_for("layout"))
                else:
                    flash("Tipo de arquivo não permitido ou arquivo ausente.", "error")
                    return redirect(url_for("layout"))

    except Exception as e:
        print("Erro no upload ou envio de notificação:", e)
        flash("Erro interno durante o envio do atestado.", "error")
        return redirect(url_for("layout"))

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("escolha"))

@app.route("/api/buscar_usuario")
def api_buscar_usuario():
    if "admin" not in session:
        return jsonify({"error": "Acesso não autorizado"}), 401

    termo = request.args.get("email")  
    

    if not termo:
        return jsonify({"error": "Termo de busca vazio"}), 400

    try:
        with pymysql.connect(**db_config) as conn:
            with conn.cursor() as cursor: 
                
               
                cursor.execute("""
                    select * from pessoa_sem_id
                    where email LIKE %s or nome LIKE %s or cpf LIKE %s
                """, (f"%{termo}%", f"%{termo}%", f"%{termo}%"))
                usuarios = cursor.fetchall()

                if not usuarios:
                    return jsonify({"error": "Nenhum usuário encontrado"})

                
                for user in usuarios:
                    cursor.execute("""
                        select descricao, DATE_FORMAT(data_envio, '%%d/%%m/%%Y %%H:%%i') as data_envio
                     -----   from atestado
                        where cpf = %s
                    """, (user["cpf"],))
                    user["atestados"] = cursor.fetchall()

                
                return jsonify({"usuarios": usuarios})

    except Exception as e:
        print("Erro ao buscar usuário:", e)
        return jsonify({"error": "Erro interno no servidor"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)