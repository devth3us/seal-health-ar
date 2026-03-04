# Instruções para rodar o projeto
#Sealhelthemail@gmail.com
#pip install Flask-Mail
#pip install Flask
#pip install pymysql


from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from recuperar_senha import recuperar  
from email_bp import mail, email_bp, enviar_notificacao_atestado
from datetime import datetime
import pymysql
import os
from werkzeug.security import generate_password_hash, check_password_hash
import json
from datetime import timedelta

app = Flask(__name__)

app.secret_key = "seal_health"
from recuperar_senha import recuperar



UPLOAD_FOLDER = 'static/uploads' 
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER



# Configuração do e-mail
EMAIL_USER = "sealhealthsuporte@sealhealth.org"
EMAIL_PASS = "Math8080@" 

# Configurações do Flask-Mail para Hostinger
app.config['MAIL_SERVER'] = 'smtp.hostinger.com' # Servidor SMTP da Hostinger
app.config['MAIL_PORT'] = 587 # Porta recomendada pela Hostinger
app.config['MAIL_USE_TLS'] = True # Desativa o TLS
app.config['MAIL_USE_SSL'] = False # Ativa o SSL (segurança da porta 465)
app.config['MAIL_USERNAME'] = EMAIL_USER 
app.config['MAIL_PASSWORD'] = EMAIL_PASS
app.config['MAIL_DEFAULT_SENDER'] = EMAIL_USER


# Função para conectar ao banco 
# Configuração do banco de dados
db_config = {
    'host': '108.179.193.125',
    'user': 'marcos12_adm',
    'password': 'Seal_Health_TCC2025',
    'database': 'marcos12_seal_health',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

#  Inicializa o Flask-Mail e registra o Blueprint
mail.init_app(app) 
app.register_blueprint(email_bp)
app.register_blueprint(recuperar)
app.secret_key = "chave-secreta"


app.config['MAX_CONTENT_LENGTH'] = 3 * 1024 * 1024 


@app.errorhandler(413)
def request_entity_too_large(error):
    flash("O arquivo enviado é muito grande. O limite é 3 MB.")
    return redirect(request.url)

# Configuração dos tipos de upload de atestado
UPLOAD_FOLDER = "static/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf"}

# Função para verificar se o arquivo é permitido
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() #i

# Função para verificar usuário no banco
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

# Escolha de perfil
@app.route("/")
def escolha():
    return render_template("escolha.html")

@app.route("/esqueci_senha")
def esqueci_senha():
    return render_template("esqueci_senha.html")


# Login Usuário US
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
        flash("success")
        return redirect(url_for("layout"))
    else:
        flash("error")
        return redirect(url_for("login_usuario"))


# Login Administrador ADM
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
        flash("success")
        return redirect(url_for("dashboard_admin"))
    else:
        flash("error")
        return redirect(url_for("login_admin"))


# Dashboard Usuário e Admin
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
    conn = None # Inicializa a conexão como None
    
    try:
        # Tenta estabelecer a conexão DENTRO DO BLOCO try
        conn = pymysql.connect(**db_config)
        with conn.cursor() as cursor:
            
            # Total de atestados enviados 
            cursor.execute("select count(*) as total from atestado")
            kpis['total_atestados'] = cursor.fetchone().get('total', 0)
            
            # Atestados pendentes 
            cursor.execute("select count(*) as pendentes from atestado where id= 0")
            kpis['atestados_pendentes'] = cursor.fetchone().get('pendentes', 0)
            
    except pymysql.Error as e:
        print("Erro específico do MySQL:", e)
        flash("Erro ao conectar ou consultar o banco de dados. Verifique a conexão.")
        kpis['total_atestados'] = 'ERRO DE DB'
        kpis['atestados_pendentes'] = 'ERRO DE DB'
    except OSError as e:
        # Captura Argumento Invalido / Falha de rede
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
        # Garante que a conexão seja fechada, se tiver sido aberta
        if conn:
            conn.close()

    return render_template(
        "dashboard_admin.html", 
        user=session["admin"],
        kpis=kpis
    )

# Admin: Listagem e Gestão de Atestados 
@app.route("/admin/gestao_atestados")
def admin_gestao_atestados():
    if "admin" not in session:
        return redirect(url_for("login_admin"))
        
    try:
        with pymysql.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                # Obtém todos os atestados para revisão, juntando dados do usuário
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


# Admin: Cadastro 
@app.route("/admin/cadastro_usuarios")
def admin_cadastro_usuarios():
    if "admin" not in session:
        return redirect(url_for("login_admin"))
    return render_template("admin_cadastro_usuarios.html", is_admin_context=True)


# A Acao de Atualizar Status do Atestado 
@app.route("/api/update_atestado", methods=["POST"])
def api_update_atestado():
    if "admin" not in session:
        return jsonify({"success": False, "message": "Não autorizado"}), 401

    data = request.get_json()
    atestado_id = data.get('id')
    novo_status = data.get('status') # 1 para Aprovado, 2 para Rejeitado, 0 para Pendente

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


# Paginas internas do Admin
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


# Rotas , anotando, talvez vou reutiliza essa duas rotas
@app.route("/base")
def base():
    return render_template("base.html")

@app.route("/busca")
def busca():
    return render_template("busca.html")


# Upload de atestados E NOTIFICAÇÃO 
# Upload de atestados E NOTIFICAÇÃO 
@app.route("/upload", methods=["POST"])
def upload_file():
    if "usuario" not in session:
        flash("Sua sessão expirou. Faça login novamente.", "error")
        return redirect(url_for("login_usuario"))  

    cpf = request.form.get("cpf")
    descricao = request.form.get("descricao")
    file = request.files.get("file")

    EMAIL_DO_RESPONSAVEL = "sealhealthsuporte@sealhealth.org"

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

                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)

                    # Se você tiver uma coluna "status" no banco, recomendo já inserir como pendente (0)
                    cursor.execute(""" 
                        insert into atestado (descricao, cpf, caminho, status) 
                        values (%s, %s, %s, '0')
                    """, (descricao, cpf, filepath))
                    conn.commit()

                    # Envio de notificação
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



# Logout
@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("escolha"))


# de busca (para admin)
@app.route("/api/buscar_usuario")
def api_buscar_usuario():
    termo = request.args.get("email")  
    try:
        with pymysql.connect(**db_config) as conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                
                cursor.execute("""
                    select cpf, nome, email, dt_nasc, cep, num_ende, complemento_ende, tell, tipo
                    from pessoa
                    where email LIKE %s or nome LIKE %s or cpf LIKE %s
                """, (f"%{termo}%", f"%{termo}%", f"%{termo}%"))
                usuarios = cursor.fetchall()

                if not usuarios:
                    return {"error": "Nenhum usuário encontrado"}

                # Busca atestados de todos os usuarios encontrados
                for user in usuarios:
                    cursor.execute("""
                        select descricao, DATE_FORMAT(data_envio, '%d/%m/%Y %H:%i') as data_envio
                        from atestado
                        where cpf = %s
                    """, (user["cpf"],))
                    user["atestados"] = cursor.fetchall()

                return {"usuarios": usuarios}

    except Exception as e:
        print("Erro ao buscar usuário:", e)
        return {"error": "Erro interno"}

# -------------------------------
# Iniciar o app
# -------------------------------
# if __name__ == "__main__":
#     public_url = ngrok.connect(8080)
#     print("URL pública:", public_url)
#     app.run(port=8080, debug=True)


if __name__ == "__main__":
    # Cria túnel HTTP (e não HTTPS) para evitar o erro de handshake TLS
    # public_url = ngrok.connect(80, "http")
    # print(f" URL pública: {public_url}")

    # Inicia o servidor Flask
    app.run(host="0.0.0.0", port=80, debug=True)