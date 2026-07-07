# Sistema de Gestão de Horários - CE Lucas Leniar EF.M.P.

## A História do Sistema

O **Sistema de Gestão de Horários** nasceu da necessidade de modernizar e simplificar a complexa tarefa de organizar a grade curricular escolar. Desenvolvido para lidar com as minúcias da alocação de professores, disciplinas e infraestrutura, a plataforma foi concebida com um foco absoluto na usabilidade e eficiência, visando não apenas gerar horários, mas facilitar a vida de gestores e coordenadores pedagógicos.

Com uma interface moderna, modular e intuitiva, o sistema evoluiu para abraçar recursos como diferenciação de carga horária por turma, regras de compatibilidade de nível de ensino, gestão inteligente de espaços e laboratórios, bem como um potente gerador visual que destaca possíveis conflitos e restrições de disponibilidade. Tudo desenhado para garantir que o foco permaneça onde importa: na qualidade da educação.

## Autor e Hospedagem

Este projeto foi idealizado e criado pelo **Prof. Lucas Mercer Leniar**.

🌐 **Acesse o site oficial:** [www.lucasleniar.com.br](https://www.lucasleniar.com.br)  
⏱️ **Acesse o sistema online:** [horarios.lucasleniar.com.br](https://horarios.lucasleniar.com.br/)

## Tecnologias e Deploy no GitHub Pages

Este sistema é desenvolvido no formato **Single Page Application (SPA)**, totalmente baseado no lado do cliente (Client-side) utilizando **React** e **Tailwind CSS**. 

Isso significa que o projeto **vai funcionar perfeitamente** em hospedagens estáticas como o **GitHub Pages**, Hostinger, Vercel ou Netlify, desde que o roteamento esteja corretamente configurado para `HashRouter` (já implementado no código-fonte) ou configurando as regras de reescrita para SPAs na sua hospedagem. Como a aplicação guarda os dados no armazenamento local do navegador (`localStorage`) e processa a lógica de geração de horários via TypeScript/JavaScript no próprio cliente, ela dispensa o uso de um backend (servidor Node/PHP) tradicional para a sua funcionalidade principal.