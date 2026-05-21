#!/usr/bin/env bash
# Smoke-тесты после деплоя.
# Запускается с локалки, где лежит kubeconfig (после k3s.yml).

set -euo pipefail

KUBECONFIG="${KUBECONFIG:-$(dirname "$0")/../kubeconfig}"
export KUBECONFIG

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
blue()  { printf '\033[34m%s\033[0m\n' "$*"; }

fail=0
check() {
  local name=$1; shift
  if "$@" >/dev/null 2>&1; then
    green "  OK    $name"
  else
    red   "  FAIL  $name"
    fail=$((fail + 1))
  fi
}

blue "==> k3s cluster"
check "kubeconfig доступен"        test -f "$KUBECONFIG"
check "apiserver отвечает"          kubectl cluster-info
check "все ноды Ready"              bash -c "kubectl get nodes --no-headers | awk '{print \$2}' | grep -qvE 'NotReady|Unknown'"
check "3 master'а"                  bash -c "[ \$(kubectl get nodes -l node-role.kubernetes.io/control-plane --no-headers | wc -l) -eq 3 ]"
check "3 worker'а"                  bash -c "[ \$(kubectl get nodes -l '!node-role.kubernetes.io/control-plane' --no-headers | wc -l) -eq 3 ]"

blue "==> kube-vip"
check "kube-vip DaemonSet running"  bash -c "kubectl -n kube-system get ds kube-vip-ds -o jsonpath='{.status.numberReady}' | grep -q '^3$'"

blue "==> addons"
check "ingress-nginx Ready"         bash -c "kubectl -n ingress-nginx get ds | grep -q ingress-nginx"
check "cert-manager Ready"          bash -c "kubectl -n cert-manager get deploy cert-manager -o jsonpath='{.status.readyReplicas}' | grep -q '^1$'"

blue "==> приложения"
check "namespace nextalk существует" kubectl get ns nextalk
check "все pod'ы nextalk Running"    bash -c "kubectl -n nextalk get pods --no-headers | awk '{print \$3}' | grep -qvE 'Pending|Error|CrashLoopBackOff'"

if [ $fail -eq 0 ]; then
  green "==> Все проверки пройдены."
else
  red "==> Провалено: $fail"
  exit 1
fi
