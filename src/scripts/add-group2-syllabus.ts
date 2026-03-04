'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, writeBatch, doc, query, where, getDocs } from 'firebase/firestore';
import type { Syllabus } from '@/lib/types';

const syllabusData = {
    'Group II': {
        'பகுதி அ': {
            'அலகு I: பொது அறிவியல்': [
                'அறிவியல் அறிவு மற்றும் அறிவியல் உணர்வு - பகுத்தறிதல் - பொருள் உணராமல் கற்றலும் கருத்துணர்ந்து கற்றலும்',
                'கடந்தகாலம், நிகழ்காலம், எதிர்காலம் பற்றி புரிந்து கொள்வதற்கான ஒரு கருவி அறிவியல்',
                'பேரண்டத்தின் இயல்பு - பொது அறிவியல் விதிகள் - இயக்கவியல் - பருப்பொருளின் பண்புகள், விசை, இயக்கம் மற்றும் ஆற்றல்',
                'அன்றாட வாழ்வில் இயக்கவியல், மின்னியல், காந்தவியல், ஒளி, ஒலி, வெப்பம், அணுக்கரு இயற்பியல், லேசர் (LASER), மின்னணுவியல் மற்றும் தகவல் தொடர்பியல் ஆகியவற்றின் அடிப்படை கோட்பாடுகளின் பயன்பாடுகள்',
                'தனிமங்களும் சேர்மங்களும், அமிலங்கள், காரங்கள், உப்புகள், பெட்ரோலிய பொருட்கள், உரங்கள், பூச்சிக்கொல்லிகள்',
                'உயிரியலின் முக்கிய கோட்பாடுகள், உயிர் உலகின் வகைப்பாடு, பரிணாமம், மரபியல், உடலியங்கியல், உணவியல், உடல்நலம் மற்றும் சுகாதாரம், மனிதநோய்கள்',
                'சுற்றுப்புறச்சூழல் மற்றும் சூழலியல்',
                'அறிவியல் மற்றும் தொழில்நுட்பத்தில் அண்மைக்கால கண்டுபிடிப்புகள்',
                'நடப்பு நிகழ்வுகள்',
            ],
            'அலகு II: இந்தியாவின் புவியியல்': [
                'அமைவிடம் - இயற்கை அமைவுகள்',
                'பருவமழை, மழைப்பொழிவு, வானிலை மற்றும் காலநிலை',
                'நீர் வளங்கள் - இந்திய ஆறுகள்',
                'மண், கனிம வளங்கள் மற்றும் இயற்கை வளங்கள்',
                'காடு மற்றும் வன உயிரினங்கள் - வேளாண் முறைகள்',
                'போக்குவரத்து - தகவல் தொடர்பு',
                'சமூகப் புவியியல் - மக்கள்தொகை அடர்த்தி மற்றும் பரவல் - இனம், மொழிக் குழுக்கள் மற்றும் முக்கியப் பழங்குடிகள்',
                'இயற்கைப் பேரிடர் - பேரிடர் மேலாண்மை',
                'சுற்றுச்சூழல் மாசுபடுதல் - காரணங்களும் தடுப்பு முறைகளும் - பருவநிலை மாற்றம் - பசுமை ஆற்றல்',
                'புவியியல் அடையாளங்கள்',
                'நடப்பு நிகழ்வுகள்',
            ],
            'அலகு III: இந்தியாவின் வரலாறு, பண்பாடு மற்றும் இந்திய தேசிய இயக்கம்': [
                'சிந்து சமவெளி நாகரிகம் - குப்தர்கள், தில்லி சுல்தான்கள், முகலாயர்கள் மற்றும் மராத்தியர்கள்',
                'விஜயநகர மற்றும் பாமினி அரசுகளின் காலம் - தென் இந்திய வரலாறு',
                'தேசிய மறுமலர்ச்சி - ஆங்கிலேயர் ஆட்சிக்கு எதிரான தொடக்க கால எழுச்சிகள் - இந்திய தேசிய காங்கரஸ்',
                'தலைவர்கள் உருவாதல் - பி.ஆர்.அம்பேத்கர், பகத்சிங், பாரதியார், வ.உ.சிதம்பரனார், ஜவகர்லால் நேரு, காமராசர், மகாத்மா காந்தி, மௌலானா அபுல் கலாம் ஆசாத், தந்தை பெரியார், இராஜாஜி, சுபாஷ் சந்திர போஸ், ரவீந்திரநாத் தாகூர் மற்றும் பலர்',
                'விடுதலைப் போராட்டத்தின் பல்வேறு நிலைகள்: அகிம்சை முறையின் வளர்ச்சி மற்றும் புரட்சிகர இயக்கங்கள்',
                'வகுப்புவாதம் மற்றும் தேசப்பிரிவினை',
                'இந்திய சமூகப் பண்பாட்டு வரலாற்றில் மாற்றங்களும் தொடர்ச்சியும்',
                'இந்தியப் பண்பாட்டின் இயல்புகள், வேற்றுமையில் ஒற்றுமை - இனம், மொழி, வழக்காறு',
                'இந்தியா ஒரு மதச்சார்பற்ற நாடு, சமூக நல்லிணக்கம்',
                'கலை, அறிவியல், இலக்கியம் மற்றும் தத்துவம் ஆகிய வெவ்வேறு துறைகளில் தனித்துவம் கொண்ட ஆளுமைகள்',
            ]
        }
    }
};

async function addGroup2SyllabusTopics() {
    console.log('Adding Group II syllabus topics...');
    const { firestore } = initializeFirebaseServer();
    const syllabusCollection = collection(firestore, 'syllabus');

    // Delete existing Group II topics to prevent duplicates
    console.log('First, deleting all existing Group II syllabus topics to prevent duplicates...');
    const deleteBatch = writeBatch(firestore);
    const q = query(syllabusCollection, where('examGroup', '==', 'Group II'));
    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();
        console.log(`Deleted ${querySnapshot.size} existing Group II topics.`);
    } catch (error) {
        console.error('Error deleting existing syllabus topics:', error);
        return; // Stop if deletion fails
    }

    const addBatch = writeBatch(firestore);

    for (const [examGroup, parts] of Object.entries(syllabusData)) {
        for (const [part, units] of Object.entries(parts)) {
            for (const [unitFullName, topics] of Object.entries(units)) {
                const [unit, unitName] = unitFullName.split(': ');
                for (const topic of topics) {
                    const newDocRef = doc(syllabusCollection);
                    const syllabusEntry: Omit<Syllabus, 'id'> = {
                        examGroup: examGroup as any,
                        part,
                        unit,
                        unitName: unitName.trim(),
                        topic,
                    };
                    addBatch.set(newDocRef, {id: newDocRef.id, ...syllabusEntry});
                }
            }
        }
    }

    try {
        await addBatch.commit();
        console.log(`Successfully added Group II syllabus topics.`);
    } catch (error) {
        console.error('Error adding syllabus topics:', error);
    }
}

addGroup2SyllabusTopics();
