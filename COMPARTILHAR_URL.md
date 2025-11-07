# 🌐 Como Compartilhar a Aplicação na Rede Local

## 📋 Passos Rápidos

### 1. Obter seu IP Local

**Windows:**
```bash
# Opção 1: Execute o script
obter_ip.bat

# Opção 2: Execute o script Python
python obter_ip.py

# Opção 3: Manualmente
ipconfig
# Procure por "IPv4" ou "Endereço IPv4"
```

**Linux/Mac:**
```bash
# Opção 1: Execute o script Python
python3 obter_ip.py

# Opção 2: Manualmente
ifconfig
# Ou
ip addr show
```

### 2. Iniciar os Servidores

**Opção A: Início Automático (Recomendado)**
```bash
# Windows
INICIAR_REDE.bat

# Linux/Mac
./INICIAR_REDE.sh
```

**Opção B: Manual**

Terminal 1 - Backend:
```bash
python servidor.py
```

Terminal 2 - Frontend:
```bash
npm run dev
```

### 3. Compartilhar a URL

Após iniciar, você verá algo como:

```
IP da sua máquina: 192.168.1.100

URL PARA COMPARTILHAR:
  http://192.168.1.100:5173  (Desenvolvimento)
  http://192.168.1.100:8010  (Produção)
```

**Compartilhe essas URLs com seu time!**

---

## 🔒 Configuração do Firewall (Windows)

### Permitir Conexões na Porta 5173 (React):
1. Abra o **Firewall do Windows**
2. Clique em **Configurações avançadas**
3. Clique em **Regras de Entrada** → **Nova Regra**
4. Selecione **Porta** → **Próximo**
5. Selecione **TCP** e digite **5173** → **Próximo**
6. Selecione **Permitir a conexão** → **Próximo**
7. Marque todas as opções → **Próximo**
8. Nome: "Sistema Contratos React" → **Concluir**

### Permitir Conexões na Porta 8010 (Backend):
1. Repita o processo acima, mas use a porta **8010**
2. Nome: "Sistema Contratos Backend"

---

## 🚀 Modo Produção (Recomendado para Compartilhar)

Para ter uma única URL e melhor performance:

### 1. Construir o React:
```bash
npm run build
```

### 2. Iniciar apenas o servidor:
```bash
python servidor.py
```

### 3. Compartilhar:
```
http://SEU_IP:8010
```

**Vantagens:**
- ✅ Uma única URL
- ✅ Melhor performance
- ✅ Mais fácil de compartilhar

---

## ⚠️ Importantes

1. **Todos devem estar na mesma rede WiFi/Ethernet**
2. **Firewall deve permitir as conexões** (portas 5173 e 8010)
3. **Sua máquina deve estar ligada** para outros acessarem
4. **Use o IP local**, não `localhost` ou `127.0.0.1`

---

## 🔍 Verificar se Está Funcionando

### Do seu computador:
- http://localhost:5173 (dev) ou http://localhost:8010 (prod)

### De outro computador na rede:
- http://SEU_IP:5173 (dev) ou http://SEU_IP:8010 (prod)

Se funcionar do seu computador mas não de outros:
- ✅ Verifique o firewall
- ✅ Verifique se estão na mesma rede
- ✅ Verifique se o IP está correto

---

## 📱 Exemplo de Uso

**Você (servidor):**
```
IP: 192.168.1.100
URL: http://192.168.1.100:8010
```

**Colega 1:**
```
Acessa: http://192.168.1.100:8010
```

**Colega 2:**
```
Acessa: http://192.168.1.100:8010
```

Todos usam a mesma aplicação simultaneamente! 🎉

