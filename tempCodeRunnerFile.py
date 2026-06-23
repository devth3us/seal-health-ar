from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from recuperar_senha import recuperar  # Importando o Blueprint
from email_bp import mail, email_bp, enviar_notificacao_atestado
from datetime import datetime
import pymysql
import os
from werkzeug.security import generate_password_hash, check_password_hash
import json
from datetime import timedelta