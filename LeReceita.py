import re
import tkinter as tk
import os
from Arquivos import *

Receita = ''

vRemove = Carrega('remove')
vIngrediente = Carrega('ingredientes')
vMedida = Carrega('medidas')
vModo = Carrega('modos')
vSubMedida = ['chá', 'sopa']


def getDados(txtOrig, txtEditor):
    if (txtEditor == ''):
        return
    global vIngrediente, vMedida, vModo

    vResto = txtEditor

    def RetSelect() -> str:
        global vResto
        selecao = texto.selection_get().strip()
        texto.delete(tk.SEL_FIRST, tk.SEL_LAST)
        vResto = txtEditor
        return selecao

    def AddSelect(v, chave: str):
        selecao = RetSelect()
        if selecao != '':
            v.append({chave: selecao})
            return sorted(v, key=lambda x: len(x[chave]), reverse=True)

    def getIngrediente():
        global vIngrediente
        vIngrediente = AddSelect(vIngrediente, 'Ingrediente')

    def getMedida():
        global vMedida
        vMedida = AddSelect(vMedida, 'Medida')

    def getModo():
        global vModo
        vModo = AddSelect(vModo, 'Modo')

    def getRemove():
        global vRemove
        vRemove = AddSelect(vRemove, 'Remove')

    janela = tk.Tk()

    botao = tk.Button(janela, text='Ingrediente', command=getIngrediente)
    botao.pack(side='top')

    botao2 = tk.Button(janela, text='Medida', command=getMedida)
    botao2.pack(side='top')

    botao3 = tk.Button(janela, text='Modo', command=getModo)
    botao3.pack(side='top')

    botao4 = tk.Button(janela, text='Remove', command=getRemove)
    botao4.pack(side='top')

    label = tk.Label(janela, text=txtOrig)
    label.pack(side="top")

    texto = tk.Text(janela)
    texto.pack()

    texto.insert('end', txtEditor)

    janela.mainloop()
    return vResto.split(' ')


def BuscaIngrediente(txtOrig, vIgnorar):
    global Receita

    def Ajusta(txtEditor):
        vSubs = [
            ['½', '1/2'],
            ['⅓', '1/3'],
            ['⅔', '2/3'],
            ['¼', '1/4'],
            ['¾', '3/4'],
            ['⅛', '1/8'],
            ['⅜', '3/8'],
            ['⅝', '5/8'],
            ['⅞', '7/8']
        ]
        for v in vSubs:
            txtEditor = txtEditor.replace(v[0], v[1])

        vUn = [r'\(.*?\)']
        for v in vUn:
            vSubs = re.findall(v, txtEditor, re.IGNORECASE)
            for s in vSubs:
                txtAux = txtEditor.replace(s, '').strip()
                sInt = s[1:-1]
                if (len(re.findall("\d", txtAux)) == 0 and len(re.findall("\d", s)) != 0) or sInt in vSubMedida:
                    txtEditor = txtEditor.replace(s, sInt)
                else:
                    txtEditor = txtAux

        vUn = [r'\dg\b', r'\dml\b']
        for v in vUn:
            vSubs = re.findall(v, txtEditor, re.IGNORECASE)
            for s in vSubs:
                txtEditor = txtEditor.replace(s, s[0] + ' ' + s[1:])
        return txtEditor

    global txtEditor
    txtEditor = Ajusta(txtOrig)

    def ExisteTexto(sTexto: str) -> bool:
        global txtEditor
        if re.search(r'\b' + sTexto + r'\b', txtEditor, flags=re.IGNORECASE):
            txtEditor = re.sub(r'\b' + sTexto + r'\b', '',
                               txtEditor, flags=re.IGNORECASE)
            return True
        return False

    # print(txtEditor)
    sQtd, sMedida, sIngrediente, sModo = '', '', '', ''
    for remove in vIgnorar:
        txtEditor = txtEditor.replace(remove, ' ')

    while txtEditor.find('  ') > -1:
        txtEditor = txtEditor.replace('  ', ' ')

    for remove in vRemove:
        txtEditor = txtEditor.replace(' ' + remove['Remove'] + ' ', ' ')

    Qtds = re.findall("\d[\d a/\.]+", txtEditor)
    if len(Qtds) > 0:
        sQtd = Qtds[0].strip().split('a')[0].strip()

    for q in Qtds:
        txtEditor = txtEditor.replace(q, '')

    txtEditor = txtEditor.strip()
    while txtEditor.find('  ') > -1:
        txtEditor = txtEditor.replace('  ', ' ')

    for medida in vMedida:
        if ExisteTexto(medida['Medida']):
            sMedida = medida['Medida']
            break

    for ing in vIngrediente:
        if ExisteTexto(ing['Ingrediente']):
            sIngrediente = ing['Ingrediente']
            break

    for modo in vModo:
        if ExisteTexto(modo['Modo']):
            sModo = modo['Modo']
            break

    txtEditor = txtEditor.strip()
    while txtEditor.find('  ') > -1:
        txtEditor = txtEditor.replace('  ', ' ')

    if txtEditor != '':
        vRetIgnorar = getDados(txtOrig, txtEditor)
        BuscaIngrediente(txtOrig, vRetIgnorar)
        return

    if sQtd != '':
        nQtd = eval(sQtd.replace(' ', ' + '))
    else:
        nQtd = 1
    Receita['Ingredientes'].append(
        {'Qtd': nQtd, 'Medida': sMedida, 'Ingrediente': sIngrediente, 'Modo': sModo, 'Original': txtOrig})
    # print(sQtd, sMedida, sIngrediente, sModo)


def Le(sNomeArquivo):
    global Receita
    Receita = {"Tipo": "Pão de Queijo", "Nome": "",
               'Link': '', 'Ingredientes': [], 'Preparo': [], 'Nota': []}

    cal = open('Arquivos/' + sNomeArquivo + '.txt', 'r',
               encoding='utf-8').read().strip().split('\n')

    bIngredientes = False
    bPreparo = False
    nPreparo = 0
    for txtEditor in cal:
        if txtEditor == '':
            continue

        if Receita['Nome'] == '':
            Receita['Nome'] = txtEditor

        if txtEditor[0:4] == 'http':
            Receita['Link'] = txtEditor
            bPreparo = False
            bIngredientes = False
        elif txtEditor[0:15].upper() == 'MODO DE PREPARO' or txtEditor[0:13].upper() == 'MODO DE FAZER' or txtEditor[0:12].upper() == 'MODO PREPARO':
            bIngredientes = False
            bPreparo = True
        elif txtEditor[0:12].upper() == 'INGREDIENTES':
            bIngredientes = True
        elif txtEditor.find(':') > -1:
            Receita['Nota'].append(
                {txtEditor.split(':')[0].strip(): txtEditor.split(':')[1].strip()})
        elif bIngredientes:
            BuscaIngrediente(txtEditor, [])
        elif bPreparo:
            nPreparo += 1
            Receita['Preparo'].append({'Ordem': nPreparo, 'Texto': txtEditor})

    Grava('ingredientes', vIngrediente)
    Grava('medidas', vMedida)
    Grava('modos', vModo)
    Grava('remove', vRemove)
    Grava(sNomeArquivo, Receita, 'Dados')


for sNomeArquivo in os.listdir('Arquivos'):
    if sNomeArquivo.endswith(".txt"):
        sNomeArquivo = sNomeArquivo[0:-4]
        print(sNomeArquivo)
        Le(sNomeArquivo)
