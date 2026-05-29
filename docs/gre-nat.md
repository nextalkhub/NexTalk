# Настройка GRE-туннеля + NAT между VPS Beget

### Схема
```
10.19.0.41 (без интернета) ──GRE── 10.19.0.21 (с интернетом) ──NAT── интернет
            172.16.0.2                        172.16.0.1
```

---

### Шлюз (та VPS, у которой есть интернет)

```bash
IP_REMOTE=10.19.0.41   # VPS без интернета
IP_LOCAL=10.19.0.21

# 1. Создать GRE-туннель
ip link add gre1 type gre local $IP_LOCAL remote $IP_REMOTE
ip link set gre1 up
ip addr add 172.16.0.1/24 dev gre1

# 2. Включить форвардинг
sysctl -w net.ipv4.ip_forward=1

# 3. Включить NAT
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
```

### Клиент (VPS, которой нужен интернет)

```bash
IP_REMOTE=10.19.0.21   # VPS с интернетом
IP_LOCAL=10.19.0.41

# 1. Создать GRE-туннель
ip link add gre1 type gre local $IP_LOCAL remote $IP_REMOTE
ip link set gre1 up
ip addr add 172.16.0.2/24 dev gre1

# 2. Заменить шлюз по умолчанию
ip route del default
ip route add default via 172.16.0.1
```

### Проверка

```bash
ping 8.8.8.8
```

---

### Сохранить после перезагрузки

**Шлюз** — добавить в `/etc/network/interfaces`:
```
auto gre1
iface gre1 inet static
    address 172.16.0.1/24
    pre-up iptunnel add gre1 mode gre local 10.19.0.21 remote 10.19.0.41
    post-down iptunnel del gre1
```

**Клиент** — добавить в `/etc/network/interfaces`:
```
auto gre1
iface gre1 inet static
    address 172.16.0.2/24
    gateway 172.16.0.1
    pre-up iptunnel add gre1 mode gre local 10.19.0.41 remote 10.19.0.21
    post-down iptunnel del gre1
```

**Шлюз** — `/etc/sysctl.conf`:
```
net.ipv4.ip_forward = 1
```

**Шлюз** — сохранить iptables:
```bash
iptables-save > /etc/iptables/rules.v4
```

---

### Примечания

- Между VPS Beget в одном регионе есть приватная сеть — GRE работает без проблем
- Для нескольких VPS без интернета — добавить по туннелю на каждую, адреса `172.16.0.3`, `172.16.0.4` и т.д.
- Если нужно автоматизировать — заворачивается в Ansible
