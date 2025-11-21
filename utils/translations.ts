
export type TranslationKey = 
  // Nav & Settings
  | 'nav_search' | 'nav_vocab' | 'nav_practice' | 'settings_title' 
  | 'settings_native' | 'settings_learning' | 'settings_save'
  
  // Word Search
  | 'search_placeholder' | 'search_button' | 'searching' | 'add_word' | 'added'
  | 'definition' | 'vibe_check' | 'example' | 'ask_ai' | 'ask_placeholder'
  | 'no_image' | 'generate_image' | 'ai_visualization' | 'generate_image_btn'

  // Vocabulary
  | 'my_vocab' | 'all' | 'add_to_group' | 'story_button' | 'no_words'
  | 'current_draft' | 'my_library' | 'select_words_prompt' | 'back_to_library'
  | 'no_saved_stories' | 'save' | 'delete' | 'translate' | 'regenerate'
  | 'confirm_delete_story' | 'enter_group_name' | 'save_group' | 'beginner' | 'intermediate' | 'advanced'

  // Practice - General
  | 'flashcards' | 'pronunciation' | 'fill_blanks' | 'start_practice_prompt'
  | 'end_session' | 'next_word' | 'finish' | 'start_over' | 'new_session'
  | 'session_complete' | 'select_group'

  // Practice - Flashcard
  | 'fc_setup_title' | 'fc_setup_desc' | 'order' | 'sequential' | 'shuffle'
  | 'start_session' | 'card_count' | 'click_flip' | 'meaning' | 'context' | 'reviewed_all'

  // Practice - Pronunciation
  | 'pron_title' | 'listening' | 'analyzing' | 'tap_mic' | 'ai_score' | 'feedback' | 'skip_next'

  // Practice - Quiz
  | 'quiz_setup_title' | 'quiz_setup_desc' | 'generate_quiz' | 'writing_sentences'
  | 'failed_quiz' | 'back_setup' | 'fill_blanks_title' | 'fill_blanks_desc'
  | 'new_quiz' | 'show_translation'
;

const TRANSLATIONS: Record<string, Record<TranslationKey, string>> = {
  "English": {
    nav_search: "Search", nav_vocab: "Vocab", nav_practice: "Practice",
    settings_title: "Language Settings", settings_native: "I speak (Native)", settings_learning: "I am learning", settings_save: "Save Preferences",
    search_placeholder: "Enter a word in", search_button: "Search", searching: "Searching...", add_word: "Add Word", added: "Added",
    definition: "Definition", vibe_check: "Vibe Check & Usage", example: "Example", ask_ai: "Ask AI Tutor", ask_placeholder: "Ask about usage, grammar...",
    no_image: "No image generated", generate_image: "Generate Image", ai_visualization: "AI-generated visualization", generate_image_btn: "Generate Image",
    my_vocab: "My Vocabulary", all: "All", add_to_group: "Add to Group", story_button: "Story", no_words: "No words found.",
    current_draft: "Current Draft", my_library: "My Library", select_words_prompt: "Select words and generate a story to start.", back_to_library: "Back to Library",
    no_saved_stories: "No saved stories yet.", save: "Save", delete: "Delete", translate: "Translate", regenerate: "Regenerate",
    confirm_delete_story: "Are you sure you want to delete this story?", enter_group_name: "Enter group name...", save_group: "Save",
    beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
    flashcards: "Flashcards", pronunciation: "Pronunciation", fill_blanks: "Fill-in-the-Blank", start_practice_prompt: "Add words to your vocabulary to start practicing!",
    end_session: "End Session", next_word: "Next Word", finish: "Finish", start_over: "Start Over", new_session: "New Session",
    session_complete: "Session Complete!", select_group: "Select Group",
    fc_setup_title: "Flashcard Setup", fc_setup_desc: "Review words from specific groups.", order: "Order", sequential: "Sequential", shuffle: "Shuffle",
    start_session: "Start Session", card_count: "Card", click_flip: "Click card to flip", meaning: "Meaning", context: "Context", reviewed_all: "You've reviewed all words.",
    pron_title: "Pronunciation Trainer", listening: "Listening... Tap to stop", analyzing: "Analyzing...", tap_mic: "Tap microphone to speak", ai_score: "AI Score", feedback: "Feedback", skip_next: "Skip / Next Word",
    quiz_setup_title: "Vocab Quiz", quiz_setup_desc: "Fill-in-the-blanks for your words.", generate_quiz: "Generate Quiz", writing_sentences: "AI is writing unique sentences...",
    failed_quiz: "Could not generate questions. Try a different group.", back_setup: "Back to Setup", fill_blanks_title: "Fill-in-the-Blanks", fill_blanks_desc: "Select the correct word to complete the sentence.",
    new_quiz: "New Quiz", show_translation: "Show Translation"
  },
  "Chinese": {
    nav_search: "查词", nav_vocab: "生词本", nav_practice: "练习",
    settings_title: "语言设置", settings_native: "我的母语", settings_learning: "我想学习", settings_save: "保存设置",
    search_placeholder: "输入单词...", search_button: "搜索", searching: "搜索中...", add_word: "加入生词本", added: "已添加",
    definition: "释义", vibe_check: "语境 & Vibe Check", example: "例句", ask_ai: "AI 助教", ask_placeholder: "提问用法、语法...",
    no_image: "暂无图片", generate_image: "生成图片", ai_visualization: "AI 生成的视觉辅助", generate_image_btn: "生成图片",
    my_vocab: "我的生词本", all: "全部", add_to_group: "添加到分组", story_button: "生成故事", no_words: "暂无单词",
    current_draft: "当前草稿", my_library: "我的故事库", select_words_prompt: "请勾选左侧单词并生成故事。", back_to_library: "返回故事库",
    no_saved_stories: "暂无保存的故事。", save: "保存", delete: "删除", translate: "翻译", regenerate: "重新生成",
    confirm_delete_story: "确定要删除这个故事吗？", enter_group_name: "输入分组名称...", save_group: "保存",
    beginner: "初级", intermediate: "中级", advanced: "高级",
    flashcards: "闪卡", pronunciation: "口语发音", fill_blanks: "填空练习", start_practice_prompt: "请先添加单词到生词本再开始练习！",
    end_session: "结束练习", next_word: "下一个", finish: "完成", start_over: "重新开始", new_session: "新一轮练习",
    session_complete: "练习完成！", select_group: "选择分组",
    fc_setup_title: "闪卡设置", fc_setup_desc: "复习指定分组的单词。", order: "顺序", sequential: "按顺序", shuffle: "随机",
    start_session: "开始练习", card_count: "第", click_flip: "点击翻转卡片", meaning: "含义", context: "语境", reviewed_all: "你已复习完所有单词。",
    pron_title: "口语训练器", listening: "正在听... 点击停止", analyzing: "分析中...", tap_mic: "点击麦克风开始说话", ai_score: "AI 打分", feedback: "建议", skip_next: "跳过 / 下一个",
    quiz_setup_title: "单词测验", quiz_setup_desc: "针对你的单词进行填空测试。", generate_quiz: "生成测验", writing_sentences: "AI 正在为你编写例句...",
    failed_quiz: "无法生成题目，请尝试其他分组。", back_setup: "返回设置", fill_blanks_title: "填空练习", fill_blanks_desc: "选择正确的单词补全句子。",
    new_quiz: "新测验", show_translation: "显示翻译"
  },
  // Fallbacks for other languages to English for now, can be expanded
  "Spanish": {
    nav_search: "Buscar", nav_vocab: "Vocabulario", nav_practice: "Práctica",
    settings_title: "Configuración de idioma", settings_native: "Hablo (Nativo)", settings_learning: "Estoy aprendiendo", settings_save: "Guardar preferencias",
    search_placeholder: "Introduce una palabra...", search_button: "Buscar", searching: "Buscando...", add_word: "Añadir palabra", added: "Añadido",
    definition: "Definición", vibe_check: "Contexto y Vibe", example: "Ejemplo", ask_ai: "Preguntar a IA", ask_placeholder: "Pregunta sobre uso, gramática...",
    no_image: "Sin imagen", generate_image: "Generar Imagen", ai_visualization: "Visualización generada por IA", generate_image_btn: "Generar Imagen",
    my_vocab: "Mi Vocabulario", all: "Todos", add_to_group: "Añadir a grupo", story_button: "Historia", no_words: "No hay palabras.",
    current_draft: "Borrador actual", my_library: "Mi Biblioteca", select_words_prompt: "Selecciona palabras y genera una historia.", back_to_library: "Volver a la biblioteca",
    no_saved_stories: "No hay historias guardadas.", save: "Guardar", delete: "Eliminar", translate: "Traducir", regenerate: "Regenerar",
    confirm_delete_story: "¿Estás seguro de eliminar esta historia?", enter_group_name: "Nombre del grupo...", save_group: "Guardar",
    beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado",
    flashcards: "Tarjetas", pronunciation: "Pronunciación", fill_blanks: "Rellenar huecos", start_practice_prompt: "¡Añade palabras para empezar a practicar!",
    end_session: "Terminar sesión", next_word: "Siguiente", finish: "Terminar", start_over: "Empezar de nuevo", new_session: "Nueva sesión",
    session_complete: "¡Sesión completada!", select_group: "Seleccionar grupo",
    fc_setup_title: "Configurar Tarjetas", fc_setup_desc: "Repasar palabras de grupos específicos.", order: "Orden", sequential: "Secuencial", shuffle: "Aleatorio",
    start_session: "Empezar sesión", card_count: "Tarjeta", click_flip: "Clic para girar", meaning: "Significado", context: "Contexto", reviewed_all: "Has repasado todas las palabras.",
    pron_title: "Entrenador de Pronunciación", listening: "Escuchando... Toca para parar", analyzing: "Analizando...", tap_mic: "Toca el micrófono para hablar", ai_score: "Puntuación IA", feedback: "Comentarios", skip_next: "Saltar / Siguiente",
    quiz_setup_title: "Quiz de Vocabulario", quiz_setup_desc: "Rellena los huecos para tus palabras.", generate_quiz: "Generar Quiz", writing_sentences: "IA escribiendo frases únicas...",
    failed_quiz: "No se pudieron generar preguntas.", back_setup: "Volver", fill_blanks_title: "Rellenar huecos", fill_blanks_desc: "Selecciona la palabra correcta.",
    new_quiz: "Nuevo Quiz", show_translation: "Mostrar traducción"
  }
};

export const t = (lang: string, key: TranslationKey): string => {
  // Default to English if lang not found or key missing
  const dict = TRANSLATIONS[lang] || TRANSLATIONS['English'];
  return dict[key] || TRANSLATIONS['English'][key] || key;
};
