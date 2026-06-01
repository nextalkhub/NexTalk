# GRE-туннели + NAT

Управляется Ansible: `infra/ansible/playbooks/gre-nat.yml`.

Запуск (обычно не нужен отдельно - входит в `site.yml`):
```bash
ansible-playbook -i inventory/hosts.ini playbooks/gre-nat.yml --ask-vault-pass
```

---

## Схема

obs-vps и db-vps не имеют прямого доступа в интернет. worker-1 выступает NAT-шлюзом через два GRE-туннеля:

```
obs-vps (10.19.0.41) ──gre1── worker-1 (10.19.0.21) ── NAT ── интернет
          172.16.0.2                    172.16.0.1

db-vps  (10.19.0.31) ──gre2── worker-1 (10.19.0.21) ── NAT ── интернет
          172.16.1.2                    172.16.1.1
```

| Туннель | Шлюз (worker-1) | Клиент | Назначение |
|---------|-----------------|--------|------------|
| gre1 | 172.16.0.1 | 172.16.0.2 (obs-vps) | docker pull, apt, Grafana plugins |
| gre2 | 172.16.1.1 | 172.16.1.2 (db-vps) | apt, postgres updates |

---

## Диагностика вручную

Если туннель не поднялся после Ansible:

```bash
# На worker-1: проверить туннели
ip link show gre1 gre2
ip route

# С obs-vps: проверить интернет через туннель
ping -c 3 8.8.8.8

# С db-vps: аналогично
ping -c 3 8.8.8.8
```

Пересоздать туннель вручную (если роль не отрабатывает):

```bash
# На worker-1 (шлюз)
ip link add gre1 type gre local 10.19.0.21 remote 10.19.0.41
ip link set gre1 up
ip addr add 172.16.0.1/30 dev gre1
sysctl -w net.ipv4.ip_forward=1
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# На obs-vps (клиент)
ip link add gre1 type gre local 10.19.0.41 remote 10.19.0.21
ip link set gre1 up
ip addr add 172.16.0.2/30 dev gre1
ip route add default via 172.16.0.1
```

---

## Примечания

- Beget блокирует gratuitous ARP - VRRP/keepalived не работают, GRE работает без ограничений
- Персистентность обеспечивает Ansible-роль `gre_nat` (systemd unit при каждом запуске)
- Падение worker-1 = obs-vps и db-vps теряют интернет (Docker pull не работает, apt недоступен). Уже запущенные контейнеры продолжают работать.
