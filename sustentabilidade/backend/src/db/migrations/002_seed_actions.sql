-- Catálogo de ações (alinhado ao frontend src/data/actions.js)

INSERT OR IGNORE INTO actions_catalog (key, nome, categoria, pontos, icon, color, descricao) VALUES
('reciclar-lixo', 'Reciclei lixo', 'residuos', 15, '♻️', '#27ae60', 'Separei resíduos recicláveis para coleta adequada.'),
('banho-rapido', 'Tomei banho rápido', 'agua', 10, '🚿', '#1e6b8a', 'Reduzi o tempo de banho para menos de 5 minutos.'),
('apagar-luzes', 'Apaguei as luzes ao sair', 'energia', 10, '💡', '#f5a623', 'Desliguei todas as luzes ao deixar o cômodo.'),
('economizar-agua', 'Economizei água', 'agua', 10, '💧', '#2980b9', 'Fechei a torneira enquanto escovava os dentes ou lavava louça.'),
('evitar-desperdicio-comida', 'Evitei desperdício de comida', 'alimentacao', 12, '🥗', '#8e44ad', 'Consumi tudo que servi no prato sem jogar fora.'),
('reutilizar-materiais', 'Reutilizei materiais', 'reutilizacao', 20, '🔄', '#e67e22', 'Dei nova função a algum objeto ao invés de descartá-lo.'),
('ir-a-pe-bicicleta', 'Fui a pé ou de bicicleta', 'transporte', 25, '🚲', '#16a085', 'Me locomovi sem usar transporte motorizado.'),
('desligar-eletronicos', 'Desliguei eletrônicos em standby', 'energia', 8, '🔌', '#c0392b', 'Tirei aparelhos da tomada quando não estavam em uso.'),
('sacola-reutilizavel', 'Usei sacola reutilizável', 'residuos', 10, '🛍️', '#27ae60', 'Levei minha própria sacola às compras, sem usar sacola plástica.'),
('plantar-arvore', 'Plantei ou cuidei de uma planta', 'reutilizacao', 30, '🌱', '#2d7a3a', 'Plantei, reguei ou cuidei de uma planta ou árvore.'),
('transporte-coletivo', 'Usei transporte coletivo', 'transporte', 20, '🚌', '#2471a3', 'Preferi ônibus ou metrô ao invés de carro particular.'),
('compostagem', 'Fiz compostagem', 'residuos', 25, '🌿', '#1e8449', 'Descartei restos orgânicos em composteira.');
