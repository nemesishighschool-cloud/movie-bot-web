import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';

type IconName = React.ComponentProps<typeof Feather>['name'];

export default function AdvertisingSpace() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const dark = theme.mode === 'dark';
  const c = {
    bg: dark ? '#0B1424' : '#F7F9FD',
    card: dark ? '#142239' : '#FFFFFF',
    border: dark ? '#293B55' : '#E3EAF5',
    title: dark ? '#F1F6FF' : '#172B4D',
    text: dark ? '#BDCADC' : '#526887',
    muted: dark ? '#A6B8CF' : '#7286A1',
    soft: dark ? '#1D3253' : '#EDF3FF',
    blue: dark ? '#A6C5FF' : '#2762DF',
    line: dark ? '#344861' : '#E9EFF7',
  };
  const steps: { icon: IconName; title: string; text: string }[] = [
    { icon: 'play-circle', title: 'Choisissez une publicité', text: 'Vous décidez si vous souhaitez regarder une publicité proposée.' },
    { icon: 'gift', title: 'Recevez vos crédits', text: 'Après validation, les crédits prévus seront ajoutés à votre compte.' },
    { icon: 'film', title: 'Profitez de Movibot', text: 'Les crédits pourront servir aux fonctionnalités compatibles de la plateforme.' },
  ];
  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12), borderColor: c.border, backgroundColor: c.card }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour aux discussions" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={[styles.back, { backgroundColor: c.soft }]}>
          <Feather name="arrow-left" size={20} color={c.blue} />
        </Pressable>
        <View style={{ flex: 1 }}><Text style={[styles.headerTitle, { color: c.title }]}>Mon espace publicitaire</Text><Text style={[styles.headerSub, { color: c.muted }]}>Vos récompenses, en toute simplicité</Text></View>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: width < 520 ? 18 : 32, paddingBottom: Math.max(insets.bottom + 32, 48) }]}>
        <View style={styles.intro}>
          <View style={[styles.pill, { backgroundColor: c.soft }]}><Feather name="gift" size={14} color={c.blue} /><Text style={[styles.pillText, { color: c.blue }]}>ESPACE RÉCOMPENSES</Text></View>
          <Text style={[styles.title, { color: c.title }]}>Un petit geste,{'\n'}<Text style={{ color: c.blue }}>plus de cinéma.</Text></Text>
          <Text style={[styles.description, { color: c.text }]}>Bientôt, choisissez de regarder une publicité pour gagner des crédits à utiliser sur Movibot.</Text>
        </View>
        <View style={[styles.feature, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.featureIcon, { backgroundColor: c.soft }]}><Feather name="play" size={28} color={c.blue} /></View>
          <View style={{ flex: 1, minWidth: 0 }}><View style={[styles.status, { backgroundColor: c.soft }]}><View style={[styles.dot, { backgroundColor: c.blue }]} /><Text style={[styles.statusText, { color: c.blue }]}>BIENTÔT DISPONIBLE</Text></View><Text style={[styles.featureTitle, { color: c.title }]}>Publicités avec récompense</Text><Text style={[styles.featureText, { color: c.text }]}>L’espace est prêt à accueillir les publicités. Leur diffusion et l’attribution des crédits sont en cours de configuration.</Text></View>
        </View>
        <View style={[styles.unavailableButton, { backgroundColor: dark ? '#26384E' : '#DDE5F1' }]} accessibilityRole="button" accessibilityState={{ disabled: true }}><Feather name="lock" size={16} color={c.muted} /><Text style={[styles.buttonText, { color: c.muted }]}>Publicités indisponibles pour le moment</Text></View>
        <View style={[styles.notice, { borderColor: c.border, backgroundColor: c.card }]}><Feather name="info" size={18} color={c.blue} /><Text style={[styles.noticeText, { color: c.text }]}>Aucune publicité ne sera lancée et aucun crédit ne sera ajouté pendant cette phase de préparation.</Text></View>
        <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: c.title }]}>Comment ça fonctionnera</Text><Text style={[styles.sectionSub, { color: c.muted }]}>Simple, volontaire et transparent.</Text></View>
        <View style={[styles.steps, { backgroundColor: c.card, borderColor: c.border }]}>{steps.map((step, i) => <View key={step.title} style={[styles.step, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}><View style={[styles.stepIcon, { backgroundColor: c.soft }]}><Feather name={step.icon} size={19} color={c.blue}/></View><View style={{flex:1}}><Text style={[styles.stepTitle, {color:c.title}]}>{step.title}</Text><Text style={[styles.stepText, {color:c.text}]}>{step.text}</Text></View><Text style={[styles.stepNumber, {color:c.muted}]}>{String(i + 1).padStart(2, '0')}</Text></View>)}</View>
        <Text style={[styles.footer, { color: c.muted }]}>Les crédits, leur solde et l’historique seront disponibles une fois le système activé.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, header: { paddingHorizontal: 22, paddingBottom: 13, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }, back: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontFamily: 'Manrope_700Bold', fontSize: 15 }, headerSub: { fontFamily: 'Manrope_500Medium', fontSize: 11, marginTop: 3 },
  content: { width: '100%', maxWidth: 850, alignSelf: 'center', paddingTop: 42 }, intro: { marginBottom: 27 }, pill: { alignSelf: 'flex-start', flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 }, pillText: { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1 }, title: { fontFamily: 'Manrope_700Bold', fontSize: 34, lineHeight: 43, letterSpacing: -1.1, marginTop: 17 }, description: { fontFamily: 'Manrope_500Medium', fontSize: 14, lineHeight: 23, marginTop: 12, maxWidth: 580 },
  feature: { borderWidth: 1, borderRadius: 18, padding: 22, flexDirection: 'row', alignItems: 'flex-start', gap: 17 }, featureIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 17 }, status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 20 }, dot: { width: 6, height: 6, borderRadius: 3 }, statusText: { fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: .6 }, featureTitle: { fontFamily: 'Manrope_700Bold', fontSize: 17, marginTop: 10 }, featureText: { fontFamily: 'Manrope_500Medium', fontSize: 13, lineHeight: 21, marginTop: 7 }, unavailableButton: { minHeight: 48, marginTop: 13, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 12 }, buttonText: { fontFamily: 'Manrope_700Bold', fontSize: 12, textAlign: 'center', flexShrink: 1 }, notice: { flexDirection: 'row', gap: 11, padding: 15, borderWidth: 1, borderRadius: 12, marginTop: 16 }, noticeText: { fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 20, flex: 1 },
  sectionHead: { marginTop: 35, marginBottom: 15 }, sectionTitle: { fontFamily: 'Manrope_700Bold', fontSize: 18 }, sectionSub: { fontFamily: 'Manrope_500Medium', fontSize: 12, marginTop: 5 }, steps: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 20 }, step: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 17 }, stepIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, stepTitle: { fontFamily: 'Manrope_700Bold', fontSize: 13 }, stepText: { fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 19, marginTop: 4 }, stepNumber: { fontFamily: 'Manrope_700Bold', fontSize: 11 }, footer: { fontFamily: 'Manrope_500Medium', fontSize: 11, lineHeight: 19, marginTop: 20 },
});
