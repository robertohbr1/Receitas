import json


def Carrega(sNome):
    try:
        with open('Config/' + sNome + '.json', 'r') as arquivo:
            return json.load(arquivo)
    except:
        return []


def Grava(sNome, vDados, sPasta: str = 'Config'):
    with open(sPasta + '/' + sNome + '.json', 'w') as arquivo:
        json.dump(vDados, arquivo)
