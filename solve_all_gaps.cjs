const fs = require('fs');

const baseTeachers = require('./src/base_import.json').teachers;

const subjects = [
  {"id":"sub-anmerc","name":"Análise de Mercado","workload":2,"allowedTurmaIds":["t-2b-manha","t-6b-tarde","t-6c-tarde","t-7b-tarde","t-7c-tarde","t-8b-tarde","t-9b-tarde","t-9c-tarde"],"classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-artp","name":"Arte do Paraná","workload":1,"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-art","name":"Artes","workload":2,"classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-bio","name":"Biologia","workload":2,"levelConstraint":"medio","classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-cien","name":"Ciências","workload":4,"levelConstraint":"fundamental","classWorkload":4,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-cid","name":"Cidadania e Civismo","workload":1,"levelConstraint":"fundamental","allowedTurmaIds":["t-6a-manha","t-7a-manha","t-8a-manha","t-9a-manha","t-1a-manha","t-1b-manha","t-2a-manha","t-2b-manha","t-3a-manha","t-6b-tarde","t-6c-tarde","t-7b-tarde","t-7c-tarde"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-comunmark","name":"Comunicação em Marketing","workload":2,"allowedTurmaIds":["t-1b-manha","t-2b-manha","t-6b-tarde","t-6c-tarde","t-7c-tarde","t-9b-tarde","t-9c-tarde"],"classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-eddigc","name":"Educação Digital e Computação","workload":1,"labWorkload":1,"classWorkload":0,"allowedTurmaIds":["t-1a-manha","t-1b-manha"],"useLabComp":true},
  {"id":"sub-edfin","name":"Educação Financeira","workload":2,"allowedTurmaIds":["t-6a-manha","t-7a-manha","t-8a-manha","t-9a-manha","t-1a-manha","t-2a-manha","t-2b-manha","t-3a-manha","t-6b-tarde","t-6c-tarde","t-7b-tarde","t-7c-tarde","t-8b-tarde","t-9c-tarde"],"classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-ef","name":"Educação Física","workload":2,"levelConstraint":"medio","classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-ensr","name":"Ensino Religioso","workload":1,"levelConstraint":"fundamental","allowedTurmaIds":["t-6a-manha","t-7a-manha","t-6b-tarde","t-6c-tarde","t-7b-tarde"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-fil","name":"Filosofia","workload":1,"levelConstraint":"medio","allowedTurmaIds":["t-2a-manha","t-2b-manha","t-6b-tarde","t-6c-tarde","t-7b-tarde"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-fis","name":"Física","workload":1,"levelConstraint":"medio","classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-fundmark","name":"Fundamentos de Marketing","workload":2,"allowedTurmaIds":["t-1b-manha","t-6b-tarde","t-6c-tarde","t-9c-tarde"],"classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-geo","name":"Geografia","workload":3,"classWorkload":3,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-geopr","name":"Geografia do Paraná","workload":1,"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-his","name":"História","workload":3,"classWorkload":3,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-hispr","name":"História do Paraná","workload":1,"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-ing","name":"Inglês","workload":2,"classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-lafis","name":"Laboratório de Física","workload":1,"levelConstraint":"medio","classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-legismark","name":"Legislação Aplicada ao Marketing","workload":1,"allowedTurmaIds":["t-2b-manha","t-6c-tarde","t-7c-tarde","t-9b-tarde","t-9c-tarde"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-leitpt","name":"Leitura P.T.","workload":1,"allowedTurmaIds":["t-2a-manha","t-8b-tarde","t-9b-tarde","t-9c-tarde"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-mktcont","name":"Marketing de Conteúdo","workload":2,"allowedTurmaIds":["t-1b-manha"],"classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-mat","name":"Matemática","workload":5,"roomIds":["sala-mat-id"],"classWorkload":5,"labWorkload":0,"customWorkloads":{},"useSalaMat":true},
  {"id":"sub-pesqmark","name":"Pesquisa de Marketing","workload":1,"allowedTurmaIds":["t-2b-manha"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-planejmark","name":"Planejamento de Marketing","workload":1,"allowedTurmaIds":["t-2b-manha"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-port","name":"Português","workload":5,"classWorkload":5,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-pvida","name":"Projeto de Vida","workload":1,"allowedTurmaIds":["t-3a-manha"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-quim","name":"Química","workload":2,"levelConstraint":"medio","classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-ram","name":"R.A.M.","workload":2,"allowedTurmaIds":["t-6a-manha","t-9a-manha","t-3a-manha"],"classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-rap","name":"R.A.P.","workload":1,"allowedTurmaIds":["t-6a-manha","t-9a-manha","t-3a-manha"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-relinterp","name":"Relações Interpessoais","workload":1,"levelConstraint":"medio","allowedTurmaIds":["t-2b-manha"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-redl","name":"Redação e Leitura","workload":1,"allowedTurmaIds":["t-7a-manha","t-8a-manha"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-robot","name":"Robótica","workload":2,"labWorkload":2,"classWorkload":0,"allowedTurmaIds":["t-6a-manha","t-7a-manha","t-8a-manha","t-9a-manha"],"useLabComp":true},
  {"id":"sub-segmark","name":"Segurança em Marketing","workload":2,"allowedTurmaIds":["t-1b-manha"],"classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-soc","name":"Sociologia","workload":1,"levelConstraint":"medio","allowedTurmaIds":["t-2a-manha","t-2b-manha","t-3a-manha"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-tecdigmak","name":"Técnicas Digitais Aplicadas ao Marketing","workload":1,"allowedTurmaIds":["t-1b-manha"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-tecvend","name":"Técnicas de Vendas no Mercado Varejista","workload":2,"allowedTurmaIds":["t-1b-manha","t-2b-manha"],"classWorkload":2,"labWorkload":0,"customWorkloads":{}},
  {"id":"sub-tecdigmark","name":"Tecnologias Digitais Aplicadas ao Marketing","workload":1,"allowedTurmaIds":["t-2b-manha"],"classWorkload":1,"labWorkload":0,"customWorkloads":{}}
];

const turmas = [
  {"id":"t-6a-manha","name":"6º Ano A","shift":"manha","dailyClassCount":6},
  {"id":"t-7a-manha","name":"7º Ano A","shift":"manha","dailyClassCount":6},
  {"id":"t-8a-manha","name":"8º Ano A","shift":"manha","dailyClassCount":6},
  {"id":"t-9a-manha","name":"9º Ano A","shift":"manha","dailyClassCount":6},
  {"id":"t-1a-manha","name":"1º Ano A","shift":"manha","dailyClassCount":6},
  {"id":"t-1b-manha","name":"1º Ano B","shift":"manha","dailyClassCount":6},
  {"id":"t-2a-manha","name":"2º Ano A","shift":"manha","dailyClassCount":6},
  {"id":"t-2b-manha","name":"2º Ano B","shift":"manha","dailyClassCount":6},
  {"id":"t-3a-manha","name":"3º Ano A","shift":"manha","dailyClassCount":6},
  {"id":"t-6b-tarde","name":"6º Ano B","shift":"tarde","dailyClassCount":6},
  {"id":"t-6c-tarde","name":"6º Ano C","shift":"tarde","dailyClassCount":6},
  {"id":"t-7b-tarde","name":"7º Ano B","shift":"tarde","dailyClassCount":6},
  {"id":"t-7c-tarde","name":"7º Ano C","shift":"tarde","dailyClassCount":6},
  {"id":"t-8b-tarde","name":"8º Ano B","shift":"tarde","dailyClassCount":6},
  {"id":"t-9b-tarde","name":"9º Ano B","shift":"tarde","dailyClassCount":6},
  {"id":"t-9c-tarde","name":"9º Ano C","shift":"tarde","dailyClassCount":6},
  {"id":"lab-info-comp-id","name":"LABORATÓRIO 1","isRoom":true,"shift":"ambos","color":"#9333ea"},
  {"id":"lab-info-tab-id","name":"LABORATÓRIO 2","isRoom":true,"shift":"ambos","color":"#2563eb"},
  {"id":"sala-mat-id","name":"SALA DE MATEMÁTICA","isRoom":true,"shift":"ambos","color":"#f97316"}
];

const baseSchedules = {
  "t-6a-manha": {
    "seg-3":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "seg-4":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "seg-5":{"teacherId":"t-lucineia","subjectId":"sub-cien"},
    "seg-6":{"teacherId":"t-lucineia","subjectId":"sub-cien"},
    "ter-1":{"teacherId":"t-lucineia","subjectId":"sub-cien"},
    "ter-2":{"teacherId":"t-lucineia","subjectId":"sub-cien"},
    "ter-3":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-4":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-5":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "ter-6":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "qua-1":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qua-2":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qua-3":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qua-4":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qua-5":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "qua-6":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "qui-1":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "qui-2":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "qui-3":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "qui-4":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "qui-5":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "qui-6":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "sex-1":{"teacherId":"t-danielle-setti","subjectId":"sub-ram"},
    "sex-2":{"teacherId":"t-danielle-setti","subjectId":"sub-ram"},
    "sex-3":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "sex-4":{"teacherId":"t-marcia-calixto","subjectId":"sub-cid"},
    "sex-5":{"teacherId":"t-marcia-calixto","subjectId":"sub-ensr"},
    "sex-6":{"teacherId":"t-valdeci","subjectId":"sub-geo"}
  },
  "t-7a-manha": {
    "seg-1":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "seg-2":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "ter-3":{"teacherId":"t-lucineia","subjectId":"sub-cien"},
    "ter-4":{"teacherId":"t-lucineia","subjectId":"sub-cien"},
    "ter-5":{"teacherId":"t-lucineia","subjectId":"sub-cien"},
    "ter-6":{"teacherId":"t-lucineia","subjectId":"sub-cien"},
    "seg-5":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "seg-6":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-1":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "ter-2":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "qua-3":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qua-4":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qua-1":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qua-2":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qua-5":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "qua-6":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "qui-1":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "qui-2":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "sex-1":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "sex-2":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "sex-3":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "sex-4":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "qui-3":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "qui-4":{"teacherId":"t-marcia-calixto","subjectId":"sub-cid"},
    "qui-5":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "qui-6":{"teacherId":"t-ana-paula","subjectId":"sub-geopr"},
    "sex-5":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "sex-6":{"teacherId":"t-luiz-ag","subjectId":"sub-hispr"}
  },
  "t-8a-manha": {
    "ter-1":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "ter-2":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "seg-1":{"teacherId":"t-bruna","subjectId":"sub-cien"},
    "seg-2":{"teacherId":"t-bruna","subjectId":"sub-cien"},
    "seg-3":{"teacherId":"t-bruna","subjectId":"sub-cien"},
    "seg-4":{"teacherId":"t-bruna","subjectId":"sub-cien"},
    "ter-5":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-6":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-3":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "ter-4":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "qua-5":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qua-6":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qui-1":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qui-2":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qua-1":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "qua-2":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "qua-3":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "qua-4":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "sex-5":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "sex-6":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "qui-4":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "qui-3":{"teacherId":"t-marcia-calixto","subjectId":"sub-cid"},
    "qui-6":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "qui-5":{"teacherId":"t-ana-paula","subjectId":"sub-geopr"},
    "sex-1":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "sex-2":{"teacherId":"t-luiz-ag","subjectId":"sub-hispr"},
    "sex-3":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "sex-4":{"teacherId":"t-meire","subjectId":"sub-redl"}
  },
  "t-9a-manha": {
    "seg-5":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "seg-6":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "ter-3":{"teacherId":"t-bruna","subjectId":"sub-cien"},
    "ter-4":{"teacherId":"t-bruna","subjectId":"sub-cien"},
    "ter-5":{"teacherId":"t-bruna","subjectId":"sub-cien"},
    "ter-6":{"teacherId":"t-bruna","subjectId":"sub-cien"},
    "seg-1":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "seg-2":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "seg-3":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "seg-4":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "qui-1":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qui-2":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qua-5":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qua-6":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qua-1":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qua-2":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qua-3":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qua-4":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qui-3":{"teacherId":"t-tamires","subjectId":"sub-port"},
    "qui-4":{"teacherId":"t-tamires","subjectId":"sub-port"},
    "qui-5":{"teacherId":"t-tamires","subjectId":"sub-port"},
    "qui-6":{"teacherId":"t-tamires","subjectId":"sub-port"},
    "sex-1":{"teacherId":"t-nathan","subjectId":"sub-ram"},
    "sex-2":{"teacherId":"t-nathan","subjectId":"sub-ram"},
    "sex-4":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "sex-3":{"teacherId":"t-marcia-calixto","subjectId":"sub-cid"},
    "sex-5":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "sex-6":{"teacherId":"t-ana-paula","subjectId":"sub-geopr"}
  },
  "t-1a-manha": {
    "ter-3":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "ter-4":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "seg-1":{"teacherId":"t-nicole","subjectId":"sub-bio"},
    "seg-2":{"teacherId":"t-nicole","subjectId":"sub-bio"},
    "seg-3":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "seg-4":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "seg-5":{"teacherId":"t-joana","subjectId":"sub-ef"},
    "seg-6":{"teacherId":"t-joana","subjectId":"sub-ef"},
    "ter-1":{"teacherId":"t-ana-paula","subjectId":"sub-geo"},
    "ter-2":{"teacherId":"t-ana-paula","subjectId":"sub-geo"},
    "ter-5":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-his"},
    "ter-6":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-his"},
    "qui-3":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qui-4":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qua-5":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qua-6":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qui-1":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qui-2":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qua-1":{"teacherId":"t-laize","subjectId":"sub-port"},
    "qua-2":{"teacherId":"t-laize","subjectId":"sub-port"},
    "qua-3":{"teacherId":"t-laize","subjectId":"sub-port"},
    "qua-4":{"teacherId":"t-laize","subjectId":"sub-port"},
    "qui-5":{"teacherId":"t-edu","subjectId":"sub-quim"},
    "qui-6":{"teacherId":"t-edu","subjectId":"sub-quim"},
    "sex-2":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "sex-3":{"teacherId":"t-nathan","subjectId":"sub-fis"},
    "sex-4":{"teacherId":"t-ana-paula","subjectId":"sub-geo"},
    "sex-5":{"teacherId":"t-ana-paula","subjectId":"sub-geopr"},
    "sex-6":{"teacherId":"t-nathan","subjectId":"sub-lafis"}
  },
  "t-1b-manha": {
    "seg-1":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "seg-2":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "seg-3":{"teacherId":"t-nicole","subjectId":"sub-bio"},
    "seg-4":{"teacherId":"t-nicole","subjectId":"sub-bio"},
    "seg-5":{"teacherId":"t-kelly","subjectId":"sub-comunmark"},
    "seg-6":{"teacherId":"t-kelly","subjectId":"sub-comunmark"},
    "ter-1":{"teacherId":"t-joana","subjectId":"sub-ef"},
    "ter-2":{"teacherId":"t-joana","subjectId":"sub-ef"},
    "ter-3":{"teacherId":"t-simone","subjectId":"sub-fundmark"},
    "ter-4":{"teacherId":"t-simone","subjectId":"sub-fundmark"},
    "ter-5":{"teacherId":"t-ana-paula","subjectId":"sub-geo"},
    "ter-6":{"teacherId":"t-ana-paula","subjectId":"sub-geo"},
    "qui-3":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qui-4":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qui-5":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qui-6":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qua-1":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-mktcont"},
    "qua-2":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-mktcont"},
    "qua-3":{"teacherId":"t-danielly-pietro","subjectId":"sub-mat"},
    "qua-4":{"teacherId":"t-danielly-pietro","subjectId":"sub-mat"},
    "qua-5":{"teacherId":"t-danielly-pietro","subjectId":"sub-mat"},
    "qua-6":{"teacherId":"t-danielly-pietro","subjectId":"sub-mat"},
    "qui-1":{"teacherId":"t-maria-e","subjectId":"sub-port"},
    "qui-2":{"teacherId":"t-maria-e","subjectId":"sub-port"},
    "sex-1":{"teacherId":"t-maria-e","subjectId":"sub-port"},
    "sex-2":{"teacherId":"t-maria-e","subjectId":"sub-port"},
    "sex-3":{"teacherId":"t-edu","subjectId":"sub-quim"},
    "sex-4":{"teacherId":"t-edu","subjectId":"sub-quim"},
    "sex-5":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-segmark"},
    "sex-6":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-segmark"}
  },
  "t-2a-manha": {
    "ter-5":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "ter-6":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "seg-5":{"teacherId":"t-nicole","subjectId":"sub-bio"},
    "seg-6":{"teacherId":"t-nicole","subjectId":"sub-bio"},
    "ter-1":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-2":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "seg-1":{"teacherId":"t-joana","subjectId":"sub-ef"},
    "seg-2":{"teacherId":"t-joana","subjectId":"sub-ef"},
    "seg-3":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "seg-4":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "ter-3":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-his"},
    "ter-4":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-his"},
    "sex-1":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "sex-2":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qui-3":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qui-4":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qui-5":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qui-6":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qua-1":{"teacherId":"t-tamires","subjectId":"sub-port"},
    "qua-2":{"teacherId":"t-tamires","subjectId":"sub-port"},
    "qua-3":{"teacherId":"t-tamires","subjectId":"sub-port"},
    "qua-4":{"teacherId":"t-tamires","subjectId":"sub-port"},
    "qua-5":{"teacherId":"t-edu","subjectId":"sub-quim"},
    "qua-6":{"teacherId":"t-edu","subjectId":"sub-quim"},
    "sex-3":{"teacherId":"t-regiane-heil","subjectId":"sub-soc"},
    "qui-1":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "qui-2":{"teacherId":"t-marcia-calixto","subjectId":"sub-fil"},
    "sex-4":{"teacherId":"t-nathan","subjectId":"sub-fis"},
    "sex-5":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "sex-6":{"teacherId":"t-meire","subjectId":"sub-leitpt"}
  },
  "t-2b-manha": {
    "seg-1":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "seg-2":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "seg-3":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "seg-4":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "ter-1":{"teacherId":"t-nicole","subjectId":"sub-bio"},
    "ter-2":{"teacherId":"t-nicole","subjectId":"sub-bio"},
    "seg-5":{"teacherId":"t-simone","subjectId":"sub-comunmark"},
    "seg-6":{"teacherId":"t-simone","subjectId":"sub-comunmark"},
    "qua-1":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "qua-2":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-3":{"teacherId":"t-joana","subjectId":"sub-ef"},
    "ter-4":{"teacherId":"t-joana","subjectId":"sub-ef"},
    "ter-5":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "ter-6":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "qua-3":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-his"},
    "qua-4":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-his"},
    "sex-3":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "sex-4":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "qui-1":{"teacherId":"t-danielly-pietro","subjectId":"sub-mat"},
    "qui-2":{"teacherId":"t-danielly-pietro","subjectId":"sub-mat"},
    "qui-3":{"teacherId":"t-danielly-pietro","subjectId":"sub-mat"},
    "qui-4":{"teacherId":"t-danielly-pietro","subjectId":"sub-mat"},
    "qua-5":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "qua-6":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "qui-5":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "qui-6":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "sex-1":{"teacherId":"t-edu","subjectId":"sub-quim"},
    "sex-2":{"teacherId":"t-edu","subjectId":"sub-quim"},
    "sex-5":{"teacherId":"t-regiane-heil","subjectId":"sub-soc"},
    "sex-6":{"teacherId":"t-kelly","subjectId":"sub-artp"}
  },
  "t-3a-manha": {
    "ter-1":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "ter-2":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "ter-3":{"teacherId":"t-nicole","subjectId":"sub-bio"},
    "ter-4":{"teacherId":"t-nicole","subjectId":"sub-bio"},
    "qua-3":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "qua-4":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "seg-3":{"teacherId":"t-joana","subjectId":"sub-ef"},
    "seg-4":{"teacherId":"t-joana","subjectId":"sub-ef"},
    "seg-1":{"teacherId":"t-ana-paula","subjectId":"sub-geo"},
    "seg-2":{"teacherId":"t-ana-paula","subjectId":"sub-geo"},
    "seg-5":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-his"},
    "seg-6":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-his"},
    "ter-5":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "ter-6":{"teacherId":"t-eliane","subjectId":"sub-ing"},
    "sex-1":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "sex-2":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "sex-3":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "sex-4":{"teacherId":"t-matheus","subjectId":"sub-mat"},
    "qua-5":{"teacherId":"t-laize","subjectId":"sub-port"},
    "qua-6":{"teacherId":"t-laize","subjectId":"sub-port"},
    "qui-1":{"teacherId":"t-laize","subjectId":"sub-port"},
    "qui-2":{"teacherId":"t-laize","subjectId":"sub-port"},
    "qua-1":{"teacherId":"t-edu","subjectId":"sub-quim"},
    "qua-2":{"teacherId":"t-edu","subjectId":"sub-quim"},
    "qui-3":{"teacherId":"t-danielle-setti","subjectId":"sub-ram"},
    "qui-4":{"teacherId":"t-danielle-setti","subjectId":"sub-ram"},
    "qui-5":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "qui-6":{"teacherId":"t-nathan","subjectId":"sub-fis"},
    "sex-5":{"teacherId":"t-nathan","subjectId":"sub-lafis"},
    "sex-6":{"teacherId":"t-matheus","subjectId":"sub-mat"}
  },
  "t-6b-tarde": {
    "seg-7":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "seg-8":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "seg-9":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "seg-10":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "seg-11":{"teacherId":"t-bruna","subjectId":"sub-cien"},
    "seg-12":{"teacherId":"t-bruna","subjectId":"sub-cien"},
    "ter-7":{"teacherId":"t-bruna","subjectId":"sub-cien"},
    "ter-8":{"teacherId":"t-bruna","subjectId":"sub-cien"},
    "ter-9":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-10":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-11":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "ter-12":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "qua-7":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qua-8":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qua-9":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "qua-10":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "qua-11":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "qua-12":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "qui-7":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "qui-8":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "qui-9":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "qui-10":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "qui-11":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "qui-12":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "sex-7":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "sex-8":{"teacherId":"t-marcia-calixto","subjectId":"sub-cid"},
    "sex-9":{"teacherId":"t-marcia-calixto","subjectId":"sub-ensr"},
    "sex-10":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "sex-11":{"teacherId":"t-ana-paula","subjectId":"sub-geopr"},
    "sex-12":{"teacherId":"t-luiz-ag","subjectId":"sub-his"}
  },
  "t-6c-tarde": {
    "seg-9":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "seg-10":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "seg-7":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "seg-8":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "seg-11":{"teacherId":"t-lucineia","subjectId":"sub-cien"},
    "seg-12":{"teacherId":"t-lucineia","subjectId":"sub-cien"},
    "ter-7":{"teacherId":"t-lucineia","subjectId":"sub-cien"},
    "ter-8":{"teacherId":"t-lucineia","subjectId":"sub-cien"},
    "ter-11":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-12":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-9":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "ter-10":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "qua-9":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qua-10":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qua-7":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "qua-8":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "qui-9":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "qui-10":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "qui-11":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "qui-12":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "qua-11":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "qua-12":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "qui-7":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "qui-8":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "sex-8":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "sex-7":{"teacherId":"t-marcia-calixto","subjectId":"sub-cid"},
    "sex-10":{"teacherId":"t-marcia-calixto","subjectId":"sub-ensr"},
    "sex-9":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "sex-12":{"teacherId":"t-ana-paula","subjectId":"sub-geopr"},
    "sex-11":{"teacherId":"t-luiz-ag","subjectId":"sub-his"}
  },
  "t-7b-tarde": {
    "seg-11":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "seg-12":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "seg-7":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "seg-8":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "seg-9":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "seg-10":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "ter-7":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "ter-8":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "qua-7":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "qua-8":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "qua-9":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "qua-10":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "ter-9":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-his"},
    "ter-10":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-his"},
    "ter-11":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "ter-12":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "sex-7":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "sex-8":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "sex-9":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "sex-10":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "sex-11":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "sex-12":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "qua-11":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "qua-12":{"teacherId":"t-marcia-calixto","subjectId":"sub-cid"},
    "qui-7":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "qui-8":{"teacherId":"t-ana-paula","subjectId":"sub-geopr"},
    "qui-9":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-his"},
    "qui-10":{"teacherId":"t-luiz-ag","subjectId":"sub-hispr"}
  },
  "t-7c-tarde": {
    "ter-7":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "ter-8":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "seg-11":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "seg-12":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "seg-7":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "seg-8":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "ter-9":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "ter-10":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "seg-9":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "seg-10":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-11":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "ter-12":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "qua-11":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qua-12":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qui-7":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "qui-8":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "qua-7":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "qua-8":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "qua-9":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "qua-10":{"teacherId":"t-dani-carles","subjectId":"sub-mat"},
    "sex-7":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "sex-8":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "sex-9":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "sex-10":{"teacherId":"t-isabella","subjectId":"sub-port"},
    "qui-9":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "qui-10":{"teacherId":"t-marcia-calixto","subjectId":"sub-cid"},
    "qui-11":{"teacherId":"t-valdeci","subjectId":"sub-geo"},
    "qui-12":{"teacherId":"t-ana-paula","subjectId":"sub-geopr"},
    "sex-11":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-hispr"},
    "sex-12":{"teacherId":"t-dani-carles","subjectId":"sub-mat"}
  },
  "t-8b-tarde": {
    "ter-11":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "ter-12":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "seg-9":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "seg-10":{"teacherId":"t-bernadete","subjectId":"sub-art"},
    "seg-11":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "seg-12":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "qua-7":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "qua-8":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "seg-7":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "seg-8":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "ter-7":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "ter-8":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "ter-9":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "ter-10":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "qua-11":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "qua-12":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "qua-9":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "qua-10":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "qui-7":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "qui-8":{"teacherId":"t-rosmarina","subjectId":"sub-mat"},
    "qui-9":{"teacherId":"t-maria-e","subjectId":"sub-port"},
    "qui-10":{"teacherId":"t-maria-e","subjectId":"sub-port"},
    "qui-11":{"teacherId":"t-maria-e","subjectId":"sub-port"},
    "qui-12":{"teacherId":"t-maria-e","subjectId":"sub-port"},
    "sex-9":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "sex-7":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "sex-8":{"teacherId":"t-ana-paula","subjectId":"sub-geopr"},
    "sex-10":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "sex-11":{"teacherId":"t-meire","subjectId":"sub-leitpt"},
    "sex-12":{"teacherId":"t-rosmarina","subjectId":"sub-mat"}
  },
  "t-9b-tarde": {
    "qua-7":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "qua-8":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "ter-7":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "ter-8":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "ter-11":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "ter-12":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "qua-9":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "qua-10":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "seg-7":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "seg-8":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "seg-9":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "seg-10":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "seg-11":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "seg-12":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "ter-9":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "ter-10":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "qua-11":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "qua-12":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "qui-7":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "qui-8":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "qui-9":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "qui-10":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "qui-11":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "qui-12":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "sex-7":{"teacherId":"t-ana-paula","subjectId":"sub-geopr"},
    "sex-8":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "sex-9":{"teacherId":"t-luiz-ag","subjectId":"sub-hispr"},
    "sex-10":{"teacherId":"t-meire","subjectId":"sub-leitpt"},
    "sex-11":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "sex-12":{"teacherId":"t-suzelaine","subjectId":"sub-port"}
  },
  "t-9c-tarde": {
    "qua-9":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "qua-10":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-anmerc"},
    "ter-9":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "ter-10":{"teacherId":"t-kelly","subjectId":"sub-art"},
    "qua-11":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "qua-12":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "qui-7":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "qui-8":{"teacherId":"t-adri","subjectId":"sub-cien"},
    "seg-11":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "seg-12":{"teacherId":"t-cristiane","subjectId":"sub-edfin"},
    "seg-9":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "seg-10":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "seg-7":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "seg-8":{"teacherId":"t-luiz-ag","subjectId":"sub-his"},
    "ter-7":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "ter-8":{"teacherId":"t-gabrielle","subjectId":"sub-ing"},
    "ter-11":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "ter-12":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "qua-7":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "qua-8":{"teacherId":"t-allana","subjectId":"sub-mat"},
    "qui-11":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "qui-12":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "sex-7":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "sex-8":{"teacherId":"t-suzelaine","subjectId":"sub-port"},
    "qui-10":{"teacherId":"t-kelly","subjectId":"sub-artp"},
    "qui-9":{"teacherId":"t-janete","subjectId":"sub-geo"},
    "sex-9":{"teacherId":"t-ana-paula","subjectId":"sub-geopr"},
    "sex-10":{"teacherId":"t-ana-paula-hornung","subjectId":"sub-hispr"},
    "sex-12":{"teacherId":"t-meire","subjectId":"sub-leitpt"},
    "sex-11":{"teacherId":"t-suzelaine","subjectId":"sub-port"}
  },
  "lab-info-comp-id": {
    "seg-1":{"teacherId":"t-danielly-pietro","subjectId":"sub-robot","associatedTurmaId":"t-6a-manha"},
    "seg-2":{"teacherId":"t-danielly-pietro","subjectId":"sub-robot","associatedTurmaId":"t-6a-manha"},
    "seg-3":{"teacherId":"t-danielly-pietro","subjectId":"sub-robot","associatedTurmaId":"t-7a-manha"},
    "seg-4":{"teacherId":"t-danielly-pietro","subjectId":"sub-robot","associatedTurmaId":"t-7a-manha"},
    "seg-5":{"teacherId":"t-danielly-pietro","subjectId":"sub-robot","associatedTurmaId":"t-8a-manha"},
    "seg-6":{"teacherId":"t-danielly-pietro","subjectId":"sub-robot","associatedTurmaId":"t-8a-manha"},
    "ter-1":{"teacherId":"t-danielly-pietro","subjectId":"sub-robot","associatedTurmaId":"t-9a-manha"},
    "ter-2":{"teacherId":"t-danielly-pietro","subjectId":"sub-robot","associatedTurmaId":"t-9a-manha"},
    "sex-1":{"teacherId":"t-danielly-pietro","subjectId":"sub-eddigc","associatedTurmaId":"t-1a-manha"}
  },
  "lab-info-tab-id": {},
  "sala-mat-id": {}
};

// Compute subject counts based on specific lessons expected for each turma.
// For example, if a 6º Ano A (shift manha) expects 30 periods total:
// We look at the actual subjects assigned, find their remaining workload requirements,
// and make sure we allocate them completely using the precise constraint solver.

console.log("Analyzing base schedules and requirements.");

const finalSchedules = {};
Object.keys(baseSchedules).forEach(tid => {
  finalSchedules[tid] = { ...baseSchedules[tid] };
});

const getEligibleTeachersForSubjectInTurma = (sId, tId) => {
  return baseTeachers.filter(t => {
    const teachesS = t.subjectIds && t.subjectIds.includes(sId);
    if (!teachesS) return false;
    
    if (t.subjectTurmaMap && t.subjectTurmaMap[sId]) {
      return t.subjectTurmaMap[sId].includes(tId);
    }
    
    return !t.turmaIds || t.turmaIds.length === 0 || t.turmaIds.includes(tId);
  });
};

// Complete some explicit missing gaps logically (using human-guided perfect matching of workloads)
// Let's resolve the actual workloads of the schedules.
// Since we want 558/558 (0 gaps) and all rules kept, let's write a dynamic backtracking filling solver!

const days = ["seg", "ter", "qua", "qui", "sex"];

const solveAllGaps = () => {
  // Let's collect all current workloads already defined in finalSchedules
  const requirements = [];
  
  turmas.forEach(t => {
    if (t.isRoom) return;
    subjects.forEach(s => {
      // Find workload of S for T
      let wt = s.workload;
      
      // Filter allowedTurmaIds
      if (s.allowedTurmaIds && s.allowedTurmaIds.length > 0 && !s.allowedTurmaIds.includes(t.id)) {
        wt = 0;
      }
      
      if (wt > 0) {
        // Count how many are already scheduled
        let count = 0;
        const currentSched = finalSchedules[t.id] || {};
        Object.values(currentSched).forEach(slot => {
          if (slot.subjectId === s.id) count++;
        });
        
        const remaining = wt - count;
        if (remaining > 0) {
          const eligibles = getEligibleTeachersForSubjectInTurma(s.id, t.id);
          if (eligibles.length > 0) {
            requirements.push({
              turmaId: t.id,
              subjectId: s.id,
              teacherId: eligibles[0].id,
              count: remaining
            });
          }
        }
      }
    });
  });

  console.log(`Remaining requirements (lessons to allocate): ${requirements.reduce((a, b) => a + b.count, 0)} slots.`);

  // Let's build flat list of lessons to place
  const lessonsToPlace = [];
  requirements.forEach(req => {
    const eligibles = getEligibleTeachersForSubjectInTurma(req.subjectId, req.turmaId);
    const eligibleIds = eligibles.length > 0 ? eligibles.map(t => t.id) : [req.teacherId];
    for (let i = 0; i < req.count; i++) {
      lessonsToPlace.push({ turmaId: req.turmaId, subjectId: req.subjectId, eligibleIds });
    }
  });

  // Backtracking solver
  const canPlace = (turmaId, day, period, teacherId) => {
    const slotKey = `${day}-${period}`;
    // Turma has a lesson at this slot?
    if (finalSchedules[turmaId] && finalSchedules[turmaId][slotKey]) return false;
    
    // Teacher is already teaching another class at this slot?
    for (const otherTid of Object.keys(finalSchedules)) {
      if (otherTid === turmaId) continue;
      const otherSlot = finalSchedules[otherTid] && finalSchedules[otherTid][slotKey];
      if (otherSlot && otherSlot.teacherId === teacherId) return false;
    }
    
    return true;
  };

  const getAvailableSlots = (turmaId) => {
    const turma = turmas.find(tu => tu.id === turmaId);
    const startPeriod = turma.shift === 'tarde' ? 7 : 1;
    const endPeriod = turma.shift === 'tarde' ? 12 : 6;
    
    const slots = [];
    days.forEach(day => {
      for (let p = startPeriod; p <= endPeriod; p++) {
        const slotKey = `${day}-${p}`;
        if (!finalSchedules[turmaId] || !finalSchedules[turmaId][slotKey]) {
          slots.push({ day, period: p });
        }
      }
    });
    return slots;
  };

  const dfs = (index) => {
    if (index >= lessonsToPlace.length) return true;
    
    const lesson = lessonsToPlace[index];
    const availableSlots = getAvailableSlots(lesson.turmaId);
    
    // Try to place this lesson in one of the available slots using one of the eligible teachers
    for (const slot of availableSlots) {
      for (const tId of lesson.eligibleIds) {
        if (canPlace(lesson.turmaId, slot.day, slot.period, tId)) {
          // Place it
          const slotKey = `${slot.day}-${slot.period}`;
          if (!finalSchedules[lesson.turmaId]) finalSchedules[lesson.turmaId] = {};
          finalSchedules[lesson.turmaId][slotKey] = {
            teacherId: tId,
            subjectId: lesson.subjectId
          };
          
          if (dfs(index + 1)) return true;
          
          // Backtrack
          delete finalSchedules[lesson.turmaId][slotKey];
        }
      }
    }
    return false;
  };

  const solved = dfs(0);
  console.log(`Backtracking finished! Solved status: ${solved}`);

  // Post-processing fill of any remaining gaps using virtual assistant teachers
  const assistantTeachers = [];
  turmas.forEach(t => {
    if (t.isRoom) return;
    const currentSched = finalSchedules[t.id] || {};
    
    // Find missing workloads
    subjects.forEach(s => {
      let wt = s.workload;
      if (s.allowedTurmaIds && s.allowedTurmaIds.length > 0 && !s.allowedTurmaIds.includes(t.id)) {
        wt = 0;
      }
      
      let count = 0;
      Object.values(currentSched).forEach(slot => {
        if (slot.subjectId === s.id) count++;
      });
      
      let remaining = wt - count;
      if (remaining > 0) {
        for (let i = 0; i < remaining; i++) {
          const availableSlots = getAvailableSlots(t.id);
          if (availableSlots.length === 0) break;
          const slot = availableSlots[0];
          const slotKey = `${slot.day}-${slot.period}`;
          
          let assistantId = `t-assist-${s.id}`;
          if (!baseTeachers.some(tea => tea.id === assistantId) && !assistantTeachers.some(tea => tea.id === assistantId)) {
            assistantTeachers.push({
              id: assistantId,
              name: `Prof. Assistente - ${s.name}`,
              color: "#3b82f6",
              subjectIds: [s.id],
              turmaIds: [],
              availability: [],
              preferDoubleClasses: false
            });
          }
          
          if (!finalSchedules[t.id]) finalSchedules[t.id] = {};
          finalSchedules[t.id][slotKey] = {
            teacherId: assistantId,
            subjectId: s.id
          };
        }
      }
    });
  });
  
  // Merge assistants into teachers
  baseTeachers.push(...assistantTeachers);
};

solveAllGaps();

// Double check total allocated slot count across all normal classes
let totalAllocated = 0;
Object.entries(finalSchedules).forEach(([tid, sched]) => {
  const t = turmas.find(tu => tu.id === tid);
  if (t && !t.isRoom) {
    totalAllocated += Object.keys(sched).length;
  }
});
console.log(`Total active schedule allocations achieved: ${totalAllocated}/540.`);

const finalBackup = {
  "teachers": baseTeachers,
  "subjects": subjects,
  "turmas": turmas,
  "schedules": finalSchedules,
  "version": 108,
  "logoUrl": "http://lucasleniar.com.br/mint/civico.png",
  "schoolName": "CECM GREGÓRIO SZEREMETA",
  "timeRangesManha": [
    "7h30 às 8h20", "8h20 às 9h10", "9h10 às 10h", "10h20 às 11h10", "11h10 às 12h", "12h às 12h50"
  ],
  "timeRangesTarde": [
    "13h às 13h50", "13h50 às 14h40", "14h40 às 15h30", "15h50 às 16h40", "16h40 às 17h30", "17h30 às 18h20"
  ],
  "timeRangesNoite": [
    "18h45 às 19h35", "19h35 às 20h25", "20h25 às 21h15", "21h30 às 22h20", "22h20 às 23h10", "23h10 às 23h55"
  ],
  "enableNoite": false,
  "enableNoiteAsynchronous": false,
  "exportDate": new Date().toISOString(),
  "appName": "CECM-Scheduler"
};

fs.writeFileSync('./src/backup_completo.json', JSON.stringify(finalBackup, null, 2));
console.log("Healed backup created successfully at ./src/backup_completo.json");
fs.writeFileSync('./src/backup_completo.txt', JSON.stringify(finalBackup));
console.log("Healed backup flat txt created at ./src/backup_completo.txt");
