/* eslint-disable react-hooks/set-state-in-effect -- synchronize the workspace with route, viewport and remote conversation state */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { api, type Conversation, type Message } from '../lib/api';
import { MarkdownView } from './MarkdownView';
import * as DocumentPicker from 'expo-document-picker';
import {File} from 'expo-file-system';
import {useTheme} from '../lib/theme-context';
import {darkenStyles} from '../lib/dark-styles';
import { accountKey, readLocal, writeLocal } from '../lib/local-data';

type Icon = React.ComponentProps<typeof Feather>['name'];
const blue = '#2762DF';
const ink = '#192B4C';
const muted = '#7D8BA3';
const suggestions: {icon: Icon; title: string; subtitle: string; prompt: string; color: string}[] = [
  { icon: 'compass', title: 'Trouver mon prochain film', subtitle: 'Une pépite rien que pour moi', prompt: 'Aide-moi à trouver mon prochain film selon mes goûts.', color: '#EAF1FF' },
  { icon: 'film', title: 'Explorer un genre', subtitle: 'Des histoires à découvrir', prompt: 'Recommande-moi des films de science-fiction captivants.', color: '#EAF5FF' },
  { icon: 'star', title: 'Une soirée réussie', subtitle: 'Le bon film pour le bon moment', prompt: 'Quel film me conseilles-tu pour une soirée entre amis ?', color: '#F1EFFF' },
];
function IconButton({name, label, onPress, style}: {name: Icon; label: string; onPress: () => void; style?: any}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed}) => [lightStyles.iconButton, pressed && lightStyles.iconHover, style]}><Feather name={name} size={19} color="#70819C" /></Pressable>;
}
function Logo({size = 38}: {size?: number}) { return <Image source={require('../../assets/movibot-mark.png')} style={{width: size, height: size, borderRadius: size * .26}} resizeMode="cover" />; }

export function ChatWorkspace({initialId}: {initialId?: string}) {
  const {width} = useWindowDimensions();
  const {theme} = useTheme();
  const s = React.useMemo(() => theme.mode === 'dark' ? darkenStyles(lightStyles) : lightStyles, [theme.mode]);
  const wide = width >= 800;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(wide);
  const [id, setId] = useState<string | undefined>(initialId);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<{name:string; kind:'image'|'text'; data:string} | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [localMeta, setLocalMeta] = useState<Record<string, {title?: string; pinned?: boolean}>>({});
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const metaKey = accountKey(user?.user_id) + '_conversation_meta';
  useEffect(() => { readLocal(metaKey, {}).then(setLocalMeta); }, [metaKey]);
  const updateMeta = (next: typeof localMeta) => { setLocalMeta(next); writeLocal(metaKey, next).catch(() => setError('Impossible de sauvegarder sur cet appareil.')); };
  const deleteConversation = async () => {
    if (!deleteId || deleting) return;
    const target = deleteId;
    setDeleting(true);
    setDialogError('');
    try {
      await api('delete_conversation', {conv_id: target});
      const refreshed = await api<{conversations: Conversation[]}>('list_conversations');
      if ((refreshed.conversations || []).some(c => c.conv_id === target)) {
        throw new Error('La discussion est toujours présente. Réessayez.');
      }
      setConvos(previous => previous.filter(c => c.conv_id !== target));
      const remainingMeta = {...localMeta};
      delete remainingMeta[target];
      updateMeta(remainingMeta);
      if (id === target) newChat();
      setDeleteId(null);
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : 'Suppression impossible. Réessayez.');
    } finally { setDeleting(false); }
  };
  const createdId = useRef<string | undefined>(undefined);
  const scroll = useRef<React.ElementRef<typeof ScrollView>>(null);
  useEffect(() => { setOpen(wide); }, [wide]);
  useEffect(() => { setId(initialId); }, [initialId]);
  const loadConvos = useCallback(async () => {
    if (!user) { setConvos([]); return; }
    try { const d = await api<{conversations: Conversation[]}>('list_conversations'); const visible = await Promise.all((d.conversations || []).map(async c => { if (c.has_messages !== undefined) return c.has_messages ? c : null; if (c.summary || c.summarized_until) return c; try { const details = await api<{messages: Message[]}>('list_messages', {conv_id:c.conv_id}); return details.messages?.length ? c : null; } catch { return c; } })); setConvos(visible.filter((c): c is Conversation => !!c)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Impossible de charger les discussions.'); }
  }, [user]);
  useEffect(() => { if (ready) loadConvos(); }, [ready, loadConvos]);
  useEffect(() => {
    let cancelled = false;
    if (!id || !user) { setMessages([]); return; }
    if (createdId.current === id) { createdId.current = undefined; return; }
    setLoading(true);
    api<{conversation: Conversation; messages: Message[]}>('list_messages', {conv_id: id}).then(d => { if (!cancelled) setMessages(d.messages || []); }).catch(e => {if (!cancelled) setError(e instanceof Error ? e.message : 'Impossible de charger la discussion.');}).finally(() => {if (!cancelled) setLoading(false);});
    return () => {cancelled = true;};
  }, [id, user]);
  const newChat = () => { setId(undefined); setMessages([]); setText(''); setAttachment(null); setError(''); if (!wide) setOpen(false); };
  const choose = (conversationId: string) => { setId(conversationId); setError(''); if (!wide) setOpen(false); };
  const pickAttachment = async () => {
    if (!user) {setError('Connectez-vous pour joindre un fichier.');return;}
    try {
      const selected = await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png','image/webp','text/plain'],copyToCacheDirectory:true,multiple:false,base64:false});
      if (selected.canceled) return;
      const asset = selected.assets[0];
      const image = /image\/(jpeg|png|webp)/i.test(asset.mimeType || '') || /\.(jpe?g|png|webp)$/i.test(asset.name);
      const textFile = (asset.mimeType || '').startsWith('text/plain') || /\.(txt|md|csv)$/i.test(asset.name);
      if (!image && !textFile) throw new Error('Formats acceptés : JPG, PNG, WebP ou fichier texte.');
      if (asset.size && asset.size > (image ? 2000000 : 32000)) throw new Error(image ? 'Image trop volumineuse : 2 Mo maximum.' : 'Fichier texte trop volumineux : 32 Ko maximum.');
      if (image) {
        let capabilities: {image_input?:boolean};
        try { capabilities = await api<{image_input?:boolean}>('capabilities'); }
        catch { throw new Error('Impossible de vérifier la prise en charge des images. Vérifiez la connexion et le déploiement du serveur.'); }
        if (!capabilities.image_input) throw new Error('Le serveur doit être mis à jour pour analyser les images.');
        const mime = /png$/i.test(asset.mimeType || '') || /\.png$/i.test(asset.name) ? 'image/png' : /webp$/i.test(asset.mimeType || '') || /\.webp$/i.test(asset.name) ? 'image/webp' : 'image/jpeg';
        let data: string;
        if (Platform.OS === 'web' && asset.file) {
          data = await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Lecture impossible.'));reader.readAsDataURL(asset.file!);});
          data = `data:${mime};base64,` + data.split(',')[1];
        } else data = `data:${mime};base64,` + await new File(asset.uri).base64();
        if (data.length > 2666700) throw new Error('Image trop volumineuse : 2 Mo maximum.');
        setAttachment({name:asset.name,kind:'image',data});
      } else {
        const data = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new File(asset.uri).text();
        if (!data.trim() || data.length > 24000 || data.includes('\0')) throw new Error('Fichier texte vide, invalide ou trop long (24 000 caractères maximum).');
        setAttachment({name:asset.name,kind:'text',data});
      }
      setError('');
    } catch (e) {setError(e instanceof Error ? e.message : 'Impossible de lire le fichier.');}
  };
  const send = async (content?: string) => {
    const message = (content ?? text).trim();
    const selected = attachment;
    const value = selected?.kind === 'text' ? `${message || 'Analyse ce fichier texte.'}\n\n--- Fichier texte : ${selected.name.slice(0,100)} ---\n${selected.data}` : (message || (selected ? 'Que vois-tu sur cette image ?' : ''));
    if (!value || busy) return;
    if (!user) { setError('Connectez-vous pour démarrer une conversation avec Movibot.'); return; }
    setBusy(true); setError(''); setText('');
    let currentId = id;
    const temporary: Message = { msg_id: `pending-${Date.now()}`, conv_id: currentId || '', role: 'user', content: value, tokens_est: 0, provider: '', model: '', created_at: new Date().toISOString() };
    try {
      if (!currentId) {
        const created = await api<{conversation: Conversation}>('create_conversation');
        currentId = created.conversation.conv_id;
        // Setting the ID triggers the message loader; only append after creation.
        createdId.current = currentId;
        setId(currentId);
      }
      setMessages(previous => [...previous, temporary]);
      const result = await api<{conversation: Conversation; user_message: Message; assistant_message: Message; tool_events?: {type:string; status:string; label:string}[]}>('send_message', {conv_id: currentId, content: value, ...(selected?.kind === 'image' ? {image_data:selected.data} : {})});
      setMessages(previous => [...previous.filter(m => m.msg_id !== temporary.msg_id && m.msg_id !== result.user_message.msg_id && m.msg_id !== result.assistant_message.msg_id), result.user_message, {...result.assistant_message, tool_events:result.tool_events || []}]);
      setAttachment(null);
      loadConvos();
    } catch (e) {
      setMessages(previous => previous.filter(m => m.msg_id !== temporary.msg_id));
      setText(message); setError(e instanceof Error ? e.message : 'Le message n’a pas pu être envoyé. Réessayez.');
    } finally { setBusy(false); }
  };
  const current = convos.find(c => c.conv_id === id);
  const titleFor = (c: Conversation) => localMeta[c.conv_id]?.title || c.title || 'Nouvelle discussion';
  const filtered = convos.filter(c => titleFor(c).toLowerCase().includes(query.toLowerCase())).sort((a,b) => Number(!!localMeta[b.conv_id]?.pinned) - Number(!!localMeta[a.conv_id]?.pinned));
  const sidebar = <View style={[s.sidebar, {paddingTop: Math.max(insets.top, 22), paddingBottom: Math.max(insets.bottom, 18)}]}>
    <View style={s.brandRow}><View style={s.brand}><Logo size={39}/><View><Text style={s.brandName}>movi<Text style={{color:blue}}>bot</Text><Text style={{color:blue}}>.</Text></Text><Text style={s.brandSub}>VOTRE COPILOTE CINÉ</Text></View></View><IconButton name="sidebar" label="Replier la barre latérale" onPress={() => setOpen(false)} /></View>
    <Pressable accessibilityRole="button" onPress={newChat} style={({pressed}) => [s.newButton, pressed && {backgroundColor:'#1D50C2'}]}><Feather name="plus" size={19} color="white"/><Text style={s.newText}>Nouvelle discussion</Text><Feather name="arrow-up-right" size={16} color="#C9DAFF" style={{marginLeft:'auto'}}/></Pressable>
    <View style={s.search}><Feather name="search" size={17} color="#96A4BA"/><TextInput accessibilityLabel="Rechercher une discussion" style={s.searchInput} placeholder="Rechercher une discussion" placeholderTextColor="#9AA8BB" value={query} onChangeText={setQuery}/></View>
    <View style={s.sectionHead}><Text style={s.sectionLabel}>VOS DISCUSSIONS</Text><Feather name="more-horizontal" size={18} color="#A0ACC0"/></View>
    <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled">
      {!user ? <View style={s.emptySidebar}><Feather name="message-circle" size={19} color="#A4B2C7"/><Text style={s.emptySideText}>Vos conversations apparaîtront ici.</Text></View> : filtered.length === 0 ? <Text style={s.emptySideText}>{query ? 'Aucun résultat.' : 'Aucune discussion pour le moment.'}</Text> : filtered.map(c => <View key={c.conv_id}><View style={{flexDirection:'row',alignItems:'center'}}><Pressable accessibilityRole="button" onPress={() => choose(c.conv_id)} style={({pressed})=>[s.conversation, {flex:1}, (id === c.conv_id || pressed) && s.conversationActive]}><Feather name={localMeta[c.conv_id]?.pinned ? 'bookmark' : 'message-square'} size={16} color={id === c.conv_id ? blue : '#8392AA'}/><Text numberOfLines={1} style={[s.conversationText, id === c.conv_id && {color:blue}]}>{titleFor(c)}</Text></Pressable><IconButton name="more-horizontal" label={'Options pour ' + titleFor(c)} onPress={() => setMenuId(menuId === c.conv_id ? null : c.conv_id)}/></View>{menuId === c.conv_id && <View style={{backgroundColor:'#fff',borderColor:'#E5ECF6',borderWidth:1,borderRadius:10,marginLeft:20,padding:4}}><Pressable style={{padding:9}} onPress={() => {updateMeta({...localMeta,[c.conv_id]: {...localMeta[c.conv_id], pinned: !localMeta[c.conv_id]?.pinned}}); setMenuId(null);}}><Text style={{color:'#425878',fontSize:12}}>{localMeta[c.conv_id]?.pinned ? 'Désépingler' : 'Épingler'} · sur cet appareil</Text></Pressable><Pressable style={{padding:9}} onPress={() => {setRenameId(c.conv_id); setRenameText(titleFor(c)); setMenuId(null); if (!wide) setOpen(false);}}><Text style={{color:'#425878',fontSize:12}}>Renommer · sur cet appareil</Text></Pressable><Pressable style={{padding:9}} onPress={() => {setDialogError(''); setDeleteId(c.conv_id); setMenuId(null); if (!wide) setOpen(false);}}><Text style={{color:'#BA4A55',fontSize:12}}>Supprimer la discussion</Text></Pressable></View>}</View>)}
    </ScrollView>
    <Pressable accessibilityRole="button" onPress={() => { if (!wide) setOpen(false); router.push('/advertising'); }} style={[s.sideNote, {marginBottom: 9}]}><View style={s.noteIcon}><Feather name="gift" size={16} color={blue}/></View><View style={{flex:1}}><Text style={s.noteTitle}>Mon espace publicitaire</Text><Text style={s.noteText}>Publicités et crédits à venir.</Text></View><Feather name="chevron-right" size={17} color="#8193AF"/></Pressable>
    <Pressable accessibilityRole="button" onPress={() => router.push('/cinema')} style={s.sideNote}><View style={s.noteIcon}><Feather name="star" size={16} color={blue}/></View><View style={{flex:1}}><Text style={s.noteTitle}>Mon espace de cinéma</Text><Text style={s.noteText}>Films, séries et listes à retrouver.</Text></View><Feather name="chevron-right" size={17} color="#8193AF"/></Pressable>
    <View style={s.account}><View style={s.avatar}><Text style={s.avatarText}>{user?.display_name?.slice(0,1).toUpperCase() || 'M'}</Text></View><Pressable onPress={() => !user && router.push('/auth')} style={{flex:1}} accessibilityRole="button"><Text style={s.accountName} numberOfLines={1}>{user?.display_name || 'Bienvenue'}</Text><Text style={s.accountEmail} numberOfLines={1}>{user?.email || 'Se connecter à son compte'}</Text></Pressable><IconButton name='settings' label='Paramètres' onPress={() => router.push('/settings')}/></View>
  </View>;
  return <View style={s.root}>
    {open && wide && sidebar}
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.main}>
      <View style={[s.topbar, {paddingTop: Math.max(insets.top, 0)}]}><View style={s.topLeft}>{(!open || !wide) && <IconButton name="menu" label="Ouvrir le menu" onPress={() => setOpen(true)}/>}<View style={s.topDivider}/><Text style={s.topTitle} numberOfLines={1}>{current ? titleFor(current) : 'Nouvelle discussion'}</Text><Feather name="chevron-down" size={15} color="#A8B4C7"/></View><View style={s.topRight}><View style={s.onlineDot}/><Text style={s.topStatus}>Votre assistant cinéma</Text><View style={s.topLogo}><Logo size={27}/></View></View></View>
      <ScrollView ref={scroll} style={s.contentScroll} contentContainerStyle={[s.content, messages.length === 0 && {flexGrow:1, justifyContent:'center'}]} keyboardShouldPersistTaps="handled" onContentSizeChange={() => messages.length > 0 && scroll.current?.scrollToEnd({animated:true})}>
        {loading && !messages.length ? <ActivityIndicator color={blue}/> : messages.length === 0 ? <View style={s.welcome}>
          <View style={s.heroIcon}><Logo size={70}/><View style={s.heroSpark}><Feather name="star" size={13} color="#fff"/></View></View>
          <View style={s.eyebrow}><View style={s.eyebrowDot}/><Text style={s.eyebrowText}>VOTRE ASSISTANT CINÉMA</Text></View>
          <Text style={[s.heroTitle, !wide && {fontSize:32, lineHeight:41}]}>Le cinéma commence{ '\n' }<Text style={{color:blue}}>par une conversation.</Text></Text>
          <Text style={s.heroDescription}>Une envie de film ? Une question sur une série ?{ '\n' }Je suis là pour vous guider, une discussion à la fois.</Text>
          <View style={s.suggestHeading}><Text style={s.suggestLine}/><Text style={s.suggestLabel}>BESOIN D’INSPIRATION ?</Text><Text style={s.suggestLine}/></View>
          <View style={[s.cards, !wide && {flexDirection:'column'}]}>{suggestions.map(item => <Pressable key={item.title} onPress={() => {setText(item.prompt); setError('');}} accessibilityRole="button" style={({pressed})=>[s.card, pressed && s.cardHover]}><View style={[s.cardIcon,{backgroundColor:item.color}]}><Feather name={item.icon} size={19} color={blue}/></View><Text style={s.cardTitle}>{item.title}</Text><Text style={s.cardSubtitle}>{item.subtitle}</Text><Feather name="arrow-up-right" size={16} color="#9AAAC0" style={s.cardArrow}/></Pressable>)}</View>
        </View> : <View style={s.messages}>{messages.map((message, index) => <View key={message.msg_id + index} style={[s.messageRow, message.role === 'user' && {justifyContent:'flex-end'}]}>{message.role === 'assistant' && <View style={s.messageLogo}><Logo size={31}/></View>}<View style={[s.messageBody, message.role === 'user' ? s.userMessage : s.assistantMessage]}>{message.role === 'assistant' && <Text style={s.messageAuthor}>Movibot</Text>}{message.tool_events?.map((event, n) => <Text key={n} style={{fontSize:11, color:event.status === 'success' ? '#39765D' : '#A45B4F', marginBottom:8}}>◉ {event.label}</Text>)}<MarkdownView text={message.content}/></View></View>)}{busy && <View style={s.thinking}><Logo size={28}/><Text style={s.thinkingText}>Movibot réfléchit...</Text><ActivityIndicator size="small" color={blue}/></View>}</View>}
      </ScrollView>
      <View style={[s.bottom, {paddingBottom: Math.max(insets.bottom, 15)}]}>
        {error ? <View style={s.error}><Feather name="alert-circle" color="#B44848" size={16}/><Text style={s.errorText}>{error}</Text>{!user && <Pressable onPress={() => router.push('/auth')}><Text style={s.errorLink}>Connexion</Text></Pressable>}</View> : null}
        <View style={s.composer}>{attachment && <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}><Feather name={attachment.kind==='image'?'image':'file-text'} color={blue} size={16}/><Text numberOfLines={1} style={{flex:1,color:theme.textSecondary,fontSize:12}}>{attachment.name} · {attachment.kind==='image'?'envoyée au fournisseur, non conservée':'texte envoyé au fournisseur et conservé'}</Text><IconButton name="x" label="Retirer le fichier" onPress={()=>setAttachment(null)}/></View>}<TextInput accessibilityLabel="Votre message" placeholder="Demandez-moi quoi regarder..." placeholderTextColor="#9AA8BC" value={text} onChangeText={setText} multiline style={s.composerInput} onSubmitEditing={() => { if (Platform.OS === 'web') send(); }} blurOnSubmit={false}/><View style={s.composerBottom}><View style={s.composerTools}><IconButton name="paperclip" label="Joindre un fichier" onPress={pickAttachment} /><Text style={s.composerHint}>Films, séries et plus encore</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Envoyer le message" disabled={busy || (!text.trim() && !attachment)} onPress={() => send()} style={[s.send, (busy || (!text.trim() && !attachment)) && {opacity:.5}]}><Feather name="arrow-up" size={20} color="white"/></Pressable></View></View>
        <Text style={s.disclaimer}>Movibot peut faire des erreurs. Pensez à vérifier les informations importantes.</Text>
      </View>
    </KeyboardAvoidingView>
    {(renameId || deleteId) && <View style={[s.overlay, {justifyContent:'center', alignItems:'center'}]} accessibilityViewIsModal>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer la fenêtre" disabled={deleting} style={s.backdrop} onPress={() => {setRenameId(null); setDeleteId(null); setDialogError('');}} />
      <View style={s.dialog}>
        <Text style={{fontFamily:'Manrope_700Bold', fontSize:18, color:ink}}>{renameId ? 'Renommer la discussion' : 'Supprimer cette discussion ?'}</Text>
        <Text style={{fontSize:13, lineHeight:20, color:muted}}>{renameId ? 'Le titre est enregistré uniquement sur cet appareil.' : 'Cette action supprime la discussion sur le serveur et ne peut pas être annulée.'}</Text>
        {renameId && <TextInput accessibilityLabel="Nouveau titre" value={renameText} onChangeText={setRenameText} maxLength={100} style={{borderWidth:1, borderColor:'#DCE6F5', borderRadius:10, padding:12, color:ink}} />}
        {dialogError ? <Text accessibilityRole="alert" style={{color:'#B44848', fontSize:12, lineHeight:18}}>{dialogError}</Text> : null}
        <View style={{flexDirection:'row', justifyContent:'flex-end', gap:16, alignItems:'center'}}>
          <Pressable accessibilityRole="button" disabled={deleting} onPress={() => {setRenameId(null); setDeleteId(null); setDialogError('');}} style={{padding:10}}><Text style={{color:muted}}>Annuler</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={renameId ? 'Enregistrer le titre' : 'Confirmer la suppression'} disabled={deleting || (!!renameId && !renameText.trim())} onPress={() => {if (renameId && renameText.trim()) {updateMeta({...localMeta, [renameId]: {...localMeta[renameId], title:renameText.trim()}}); setRenameId(null);} else if (deleteId) {void deleteConversation();}}} style={{backgroundColor:deleteId ? '#C04E5B' : blue, paddingHorizontal:16, paddingVertical:12, borderRadius:9, opacity:deleting ? .6 : 1}}><Text style={{color:'#fff', fontFamily:'Manrope_700Bold'}}>{deleting ? 'Suppression…' : renameId ? 'Enregistrer' : 'Supprimer'}</Text></Pressable>
        </View>
      </View>
    </View>}
    {open && !wide && <View style={s.overlay}><Pressable accessibilityLabel="Fermer le menu" onPress={() => setOpen(false)} style={s.backdrop}/><View style={s.mobileSidebar}>{sidebar}</View></View>}
  </View>;
}

const lightStyles = StyleSheet.create({
 root:{flex:1, flexDirection:'row', backgroundColor:'#fff'}, main:{flex:1,minWidth:0,backgroundColor:'#FFFFFF'}, sidebar:{width:286, height:'100%', backgroundColor:'#F7F9FD', borderRightWidth:1,borderRightColor:'#E9EEF6',paddingHorizontal:18}, brandRow:{flexDirection:'row', alignItems:'center',justifyContent:'space-between', marginBottom:32},brand:{flexDirection:'row',alignItems:'center',gap:8},brandName:{fontFamily:'Manrope_700Bold',fontSize:23,letterSpacing:-1.1,color:'#142849',lineHeight:27},brandSub:{fontFamily:'Manrope_700Bold',fontSize:8,letterSpacing:1.15,color:'#98A8C1'},iconButton:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center'},iconHover:{backgroundColor:'#EAF0FA'},newButton:{height:49,backgroundColor:blue,borderRadius:11,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:15,shadowColor:'#2762DF',shadowOpacity:.17,shadowRadius:12,shadowOffset:{width:0,height:5},elevation:3},newText:{fontFamily:'Manrope_700Bold',fontSize:13,color:'#fff'},search:{height:45,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:'#E7EDF5',backgroundColor:'#fff',borderRadius:10,marginTop:16,paddingHorizontal:12},searchInput:{flex:1,fontFamily:'Manrope_500Medium',fontSize:12,color:ink,outlineStyle:'none'} as any,sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:33,marginBottom:15,paddingHorizontal:4},sectionLabel:{fontFamily:'Manrope_700Bold',fontSize:10,letterSpacing:1.2,color:'#98A6BA'},emptySidebar:{paddingHorizontal:6,paddingTop:6,gap:10},emptySideText:{fontFamily:'Manrope_500Medium',fontSize:12,lineHeight:19,color:'#98A6B9'},conversation:{flexDirection:'row',alignItems:'center',gap:11,paddingHorizontal:11,height:43,borderRadius:9},conversationActive:{backgroundColor:'#E9F0FF'},conversationText:{flex:1,fontFamily:'Manrope_600SemiBold',fontSize:12,color:'#53647F'},sideNote:{flexDirection:'row',alignItems:'center',gap:10,padding:12,backgroundColor:'#EDF3FF',borderRadius:12,marginBottom:17},noteIcon:{width:32,height:32,borderRadius:9,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},noteTitle:{fontFamily:'Manrope_700Bold',fontSize:11,color:'#344E77'},noteText:{fontFamily:'Manrope_500Medium',fontSize:10,color:'#8193AF',marginTop:3},account:{borderTopWidth:1,borderTopColor:'#E7EDF6',paddingTop:17,flexDirection:'row',alignItems:'center',gap:10},avatar:{height:37,width:37,borderRadius:12,backgroundColor:'#DBE8FF',alignItems:'center',justifyContent:'center'},avatarText:{fontFamily:'Manrope_700Bold',color:'#3768BC',fontSize:15},accountName:{fontFamily:'Manrope_700Bold',fontSize:12,color:ink},accountEmail:{fontFamily:'Manrope_500Medium',fontSize:10,color:'#98A6BA',marginTop:3},
 topbar:{minHeight:70,borderBottomWidth:1,borderBottomColor:'#F0F3F8',paddingHorizontal:26,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},topLeft:{flexDirection:'row',alignItems:'center',gap:10,flex:1},topDivider:{height:17,width:2,backgroundColor:'#DDE7F8',borderRadius:2},topTitle:{fontFamily:'Manrope_700Bold',fontSize:13,color:'#4A5D79',maxWidth:260},topRight:{flexDirection:'row',alignItems:'center',gap:8},onlineDot:{width:7,height:7,borderRadius:4,backgroundColor:'#59C99D'},topStatus:{fontFamily:'Manrope_600SemiBold',fontSize:11,color:'#8190A6'},topLogo:{marginLeft:14,borderLeftWidth:1,borderLeftColor:'#E9EEF5',paddingLeft:15},contentScroll:{flex:1},content:{paddingHorizontal:24,paddingVertical:25},welcome:{width:'100%',maxWidth:730,alignSelf:'center',alignItems:'center',paddingBottom:20},heroIcon:{width:84,height:84,borderRadius:26,backgroundColor:'#fff',borderWidth:1,borderColor:'#EBF1FB',alignItems:'center',justifyContent:'center',shadowColor:'#7295D4',shadowOffset:{width:0,height:10},shadowOpacity:.16,shadowRadius:20,elevation:4,marginBottom:25},heroSpark:{position:'absolute',right:-5,top:-5,width:23,height:23,borderRadius:8,backgroundColor:'#4C85ED',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#fff'},eyebrow:{flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'#F1F6FF',borderRadius:20,paddingHorizontal:11,paddingVertical:7,marginBottom:17},eyebrowDot:{width:6,height:6,borderRadius:3,backgroundColor:'#4F83EC'},eyebrowText:{fontFamily:'Manrope_700Bold',fontSize:9,letterSpacing:1.2,color:'#6586BE'},heroTitle:{fontFamily:'Manrope_700Bold',fontSize:39,lineHeight:50,letterSpacing:-1.6,color:'#1C2D4B',textAlign:'center'},heroDescription:{fontFamily:'Manrope_500Medium',fontSize:14,lineHeight:23,textAlign:'center',color:'#8B99AD',marginTop:17},suggestHeading:{flexDirection:'row',alignItems:'center',gap:12,marginTop:42,marginBottom:17},suggestLine:{height:1,width:30,backgroundColor:'#E5EBF4'},suggestLabel:{fontFamily:'Manrope_700Bold',fontSize:9,letterSpacing:1.2,color:'#A2AEC0'},cards:{width:'100%',flexDirection:'row',gap:12},card:{flex:1,minHeight:132,borderColor:'#E8EEF7',borderWidth:1,borderRadius:14,padding:16,backgroundColor:'#fff'},cardHover:{borderColor:'#ADC7F6',backgroundColor:'#FAFCFF'},cardIcon:{width:37,height:37,borderRadius:10,alignItems:'center',justifyContent:'center',marginBottom:15},cardTitle:{fontFamily:'Manrope_700Bold',fontSize:12,color:'#354B6E',marginBottom:5},cardSubtitle:{fontFamily:'Manrope_500Medium',fontSize:11,color:'#9AA9BD'},cardArrow:{position:'absolute',right:15,top:17},
 messages:{width:'100%',maxWidth:760,alignSelf:'center',gap:24,paddingVertical:15},messageRow:{flexDirection:'row',alignItems:'flex-start',gap:12},messageLogo:{borderWidth:1,borderColor:'#EAF0F8',borderRadius:10,overflow:'hidden'},messageBody:{maxWidth:'85%',borderRadius:16,paddingHorizontal:18,paddingVertical:13},userMessage:{backgroundColor:'#EDF3FF'},assistantMessage:{flex:1,backgroundColor:'#F8FAFD',borderWidth:1,borderColor:'#EDF1F7'},messageAuthor:{fontFamily:'Manrope_700Bold',fontSize:12,color:blue,marginBottom:6},thinking:{flexDirection:'row',alignItems:'center',gap:10},thinkingText:{fontFamily:'Manrope_600SemiBold',fontSize:12,color:muted},bottom:{width:'100%',maxWidth:800,alignSelf:'center',paddingHorizontal:24,paddingTop:5},composer:{backgroundColor:'#fff',borderWidth:1,borderColor:'#DBE5F2',borderRadius:17,paddingHorizontal:16,paddingTop:14,paddingBottom:10,shadowColor:'#35588D',shadowOpacity:.08,shadowRadius:22,shadowOffset:{width:0,height:7},elevation:3},composerInput:{minHeight:44,maxHeight:130,fontFamily:'Manrope_500Medium',fontSize:14,color:ink,textAlignVertical:'top',outlineStyle:'none'} as any,composerBottom:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},composerTools:{flexDirection:'row',alignItems:'center',gap:5},composerHint:{fontFamily:'Manrope_500Medium',fontSize:11,color:'#ACB8C8'},send:{width:38,height:38,borderRadius:11,backgroundColor:blue,alignItems:'center',justifyContent:'center'},disclaimer:{textAlign:'center',fontFamily:'Manrope_500Medium',fontSize:10,color:'#A8B4C4',marginTop:12},error:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#FFF3F3',padding:10,borderRadius:10,marginBottom:10},errorText:{flex:1,color:'#9F4444',fontSize:12},errorLink:{fontSize:12,color:blue,fontWeight:'700'},dialog:{position:'relative', zIndex:2, elevation:2, width:'90%', maxWidth:420, backgroundColor:'#fff', padding:24, borderRadius:18, gap:14},overlay:{position:'absolute',top:0,bottom:0,left:0,right:0,zIndex:10,flexDirection:'row'},backdrop:{position:'absolute',top:0,bottom:0,left:0,right:0,backgroundColor:'rgba(19,34,58,.32)'},mobileSidebar:{position:'relative',zIndex:2,elevation:2,width:286,maxWidth:'85%',height:'100%'}
});
