const VEHICLE_BRAND_MODELS = {
    Toyota: [
        { name: 'Agya', variants: ['Agya 1.2 G M/T', 'Agya GR-S CVT', 'Agya Varian Lainnya'] },
        { name: 'Avanza', variants: ['Avanza 1.3 E M/T', 'Avanza 1.5 G CVT', 'Avanza Varian Lainnya'] },
        { name: 'Calya', variants: ['Calya E M/T', 'Calya G A/T', 'Calya Varian Lainnya'] },
        { name: 'Camry', variants: ['Camry 2.5 V A/T', 'Camry Hybrid', 'Camry Varian Lainnya'] },
        { name: 'Fortuner', variants: ['Fortuner 2.4 G 4x2', 'Fortuner 2.8 GR Sport 4x4', 'Fortuner Varian Lainnya'] },
        { name: 'Hilux', variants: ['Hilux Single Cabin 4x4', 'Hilux Double Cabin V', 'Hilux Varian Lainnya'] },
        { name: 'Innova', variants: ['Innova 2.0 V A/T', 'Innova Venturer', 'Innova Varian Lainnya'] },
        { name: 'Kijang Innova Zenix', variants: ['Zenix G HEV', 'Zenix V HEV', 'Zenix Varian Lainnya'] },
        { name: 'Raize', variants: ['Raize 1.0T G M/T', 'Raize 1.0T GR Sport CVT', 'Raize Varian Lainnya'] },
        { name: 'Rush', variants: ['Rush G M/T', 'Rush TRD Sportivo A/T', 'Rush Varian Lainnya'] },
        { name: 'Veloz', variants: ['Veloz Q CVT', 'Veloz Q CVT TSS', 'Veloz Varian Lainnya'] },
        { name: 'Yaris', variants: ['Yaris G CVT', 'Yaris GR Sport', 'Yaris Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'CVT', 'Varian Lainnya'] },
    ],
    Honda: [
        { name: 'Accord', variants: ['Accord Turbo ES', 'Accord Turbo VTi-L', 'Accord Varian Lainnya'] },
        { name: 'BR-V', variants: ['BR-V S M/T', 'BR-V Prestige CVT', 'BR-V Varian Lainnya'] },
        { name: 'Brio', variants: ['Brio Satya E M/T', 'Brio RS CVT', 'Brio Varian Lainnya'] },
        { name: 'Civic', variants: ['Civic RS', 'Civic Type R', 'Civic Varian Lainnya'] },
        { name: 'City', variants: ['City E CVT', 'City RS Hatchback', 'City Varian Lainnya'] },
        { name: 'CR-V', variants: ['CR-V 1.5 Turbo', 'CR-V 2.0 Hybrid', 'CR-V Varian Lainnya'] },
        { name: 'HR-V', variants: ['HR-V S CVT', 'HR-V RS Turbo', 'HR-V Varian Lainnya'] },
        { name: 'Jazz', variants: ['Jazz RS CVT', 'Jazz RS M/T', 'Jazz Varian Lainnya'] },
        { name: 'Mobilio', variants: ['Mobilio S M/T', 'Mobilio RS CVT', 'Mobilio Varian Lainnya'] },
        { name: 'WR-V', variants: ['WR-V E CVT', 'WR-V RS CVT', 'WR-V Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'CVT', 'Varian Lainnya'] },
    ],
    Suzuki: [
        { name: 'APV', variants: ['APV Arena GA M/T', 'APV Luxury A/T', 'APV Varian Lainnya'] },
        { name: 'Baleno', variants: ['Baleno Hatchback M/T', 'Baleno Hatchback A/T', 'Baleno Varian Lainnya'] },
        { name: 'Carry', variants: ['Carry Flat Deck', 'Carry Wide Deck', 'Carry Varian Lainnya'] },
        { name: 'Ertiga', variants: ['Ertiga GA M/T', 'Ertiga Hybrid GX', 'Ertiga Varian Lainnya'] },
        { name: 'Ignis', variants: ['Ignis GL M/T', 'Ignis GX AGS', 'Ignis Varian Lainnya'] },
        { name: 'Jimny', variants: ['Jimny 3 Door AT', 'Jimny 5 Door AT', 'Jimny Varian Lainnya'] },
        { name: 'Karimun', variants: ['Karimun Wagon R GA', 'Karimun Wagon R GS', 'Karimun Varian Lainnya'] },
        { name: 'S-Presso', variants: ['S-Presso GL M/T', 'S-Presso GL AGS', 'S-Presso Varian Lainnya'] },
        { name: 'XL7', variants: ['XL7 Beta M/T', 'XL7 Alpha A/T', 'XL7 Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'CVT', 'Varian Lainnya'] },
    ],
    Mitsubishi: [
        { name: 'Colt L300', variants: ['Colt L300 Pick Up', 'Colt L300 Cab Chassis', 'Colt L300 Varian Lainnya'] },
        { name: 'Eclipse Cross', variants: ['Eclipse Cross Ultimate', 'Eclipse Cross PHEV', 'Eclipse Cross Varian Lainnya'] },
        { name: 'Outlander', variants: ['Outlander Sport GLS', 'Outlander PHEV', 'Outlander Varian Lainnya'] },
        { name: 'Pajero Sport', variants: ['Pajero Sport Exceed 4x2', 'Pajero Sport Dakar Ultimate 4x4', 'Pajero Sport Varian Lainnya'] },
        { name: 'Triton', variants: ['Triton HDX 4x4', 'Triton Athlete 4x4 AT', 'Triton Varian Lainnya'] },
        { name: 'Xpander', variants: ['Xpander GLS M/T', 'Xpander Ultimate CVT', 'Xpander Varian Lainnya'] },
        { name: 'Xpander Cross', variants: ['Xpander Cross MT', 'Xpander Cross Premium CVT', 'Xpander Cross Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'CVT', 'Varian Lainnya'] },
    ],
    Nissan: [
        { name: 'Elgrand', variants: ['Elgrand Highway Star', 'Elgrand VIP', 'Elgrand Varian Lainnya'] },
        { name: 'Juke', variants: ['Juke RX', 'Juke Red Edition', 'Juke Varian Lainnya'] },
        { name: 'Livina', variants: ['Livina EL M/T', 'Livina VE CVT', 'Livina Varian Lainnya'] },
        { name: 'Magnite', variants: ['Magnite Upper MT', 'Magnite Premium CVT', 'Magnite Varian Lainnya'] },
        { name: 'Serena', variants: ['Serena HWS Autech', 'Serena e-POWER', 'Serena Varian Lainnya'] },
        { name: 'Terra', variants: ['Terra VL 4x2', 'Terra VL 4x4', 'Terra Varian Lainnya'] },
        { name: 'X-Trail', variants: ['X-Trail 2.5 CVT', 'X-Trail Hybrid', 'X-Trail Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'CVT', 'Varian Lainnya'] },
    ],
    Daihatsu: [
        { name: 'Ayla', variants: ['Ayla X M/T', 'Ayla R CVT', 'Ayla Varian Lainnya'] },
        { name: 'Grand Max', variants: ['Gran Max Pick Up', 'Gran Max Blind Van', 'Gran Max Varian Lainnya'] },
        { name: 'Rocky', variants: ['Rocky 1.0T R M/T', 'Rocky 1.0T GR CVT', 'Rocky Varian Lainnya'] },
        { name: 'Sigra', variants: ['Sigra 1.0 D M/T', 'Sigra 1.2 R AT', 'Sigra Varian Lainnya'] },
        { name: 'Sirion', variants: ['Sirion X M/T', 'Sirion R CVT', 'Sirion Varian Lainnya'] },
        { name: 'Terios', variants: ['Terios X M/T', 'Terios R Custom A/T', 'Terios Varian Lainnya'] },
        { name: 'Xenia', variants: ['Xenia 1.3 X MT', 'Xenia 1.5 R CVT', 'Xenia Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'CVT', 'Varian Lainnya'] },
    ],
    Mazda: [
        { name: '2', variants: ['Mazda2 Hatchback', 'Mazda2 Sedan', 'Mazda2 Varian Lainnya'] },
        { name: '3', variants: ['Mazda3 Hatchback', 'Mazda3 Sedan', 'Mazda3 Varian Lainnya'] },
        { name: '6', variants: ['Mazda6 Sedan Elite', 'Mazda6 Estate Elite', 'Mazda6 Varian Lainnya'] },
        { name: 'CX-3', variants: ['CX-3 Sport 1.5', 'CX-3 Pro 2.0', 'CX-3 Varian Lainnya'] },
        { name: 'CX-30', variants: ['CX-30 Touring', 'CX-30 GT', 'CX-30 Varian Lainnya'] },
        { name: 'CX-5', variants: ['CX-5 Elite', 'CX-5 Kuro', 'CX-5 Varian Lainnya'] },
        { name: 'CX-8', variants: ['CX-8 Touring', 'CX-8 Elite', 'CX-8 Varian Lainnya'] },
        { name: 'CX-9', variants: ['CX-9 AWD', 'CX-9 FWD', 'CX-9 Varian Lainnya'] },
        { name: 'BT-50', variants: ['BT-50 4x2', 'BT-50 4x4', 'BT-50 Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'Varian Lainnya'] },
    ],
    Hyundai: [
        { name: 'Creta', variants: ['Creta Active MT', 'Creta Prime IVT', 'Creta Varian Lainnya'] },
        { name: 'Ioniq 5', variants: ['Ioniq 5 Prime', 'Ioniq 5 Signature', 'Ioniq 5 Varian Lainnya'] },
        { name: 'Palisade', variants: ['Palisade Prime', 'Palisade Signature AWD', 'Palisade Varian Lainnya'] },
        { name: 'Santa Fe', variants: ['Santa Fe GLS', 'Santa Fe Signature', 'Santa Fe Varian Lainnya'] },
        { name: 'Stargazer', variants: ['Stargazer Active MT', 'Stargazer Prime IVT', 'Stargazer Varian Lainnya'] },
        { name: 'Staria', variants: ['Staria Signature 7', 'Staria Signature 9', 'Staria Varian Lainnya'] },
        { name: 'Venue', variants: ['Venue MT', 'Venue IVT', 'Venue Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'CVT', 'Varian Lainnya'] },
    ],
    Kia: [
        { name: 'Carens', variants: ['Carens 1.5 MPI', 'Carens 1.4T DCT', 'Carens Varian Lainnya'] },
        { name: 'Carnival', variants: ['Carnival Dynamic', 'Carnival Premiere', 'Carnival Varian Lainnya'] },
        { name: 'EV6', variants: ['EV6 GT-Line', 'EV6 GT', 'EV6 Varian Lainnya'] },
        { name: 'Seltos', variants: ['Seltos EX', 'Seltos GT Line', 'Seltos Varian Lainnya'] },
        { name: 'Sonet', variants: ['Sonet Smart MT', 'Sonet Premiere IVT', 'Sonet Varian Lainnya'] },
        { name: 'Sorento', variants: ['Sorento HEV', 'Sorento Diesel', 'Sorento Varian Lainnya'] },
        { name: 'Sportage', variants: ['Sportage Hybrid', 'Sportage GT-Line', 'Sportage Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'Varian Lainnya'] },
    ],
    Wuling: [
        { name: 'Air EV', variants: ['Air EV Standard Range', 'Air EV Long Range', 'Air EV Varian Lainnya'] },
        { name: 'Almaz', variants: ['Almaz Smart Enjoy', 'Almaz RS Pro', 'Almaz Varian Lainnya'] },
        { name: 'Confero', variants: ['Confero S MT', 'Confero S ACT', 'Confero Varian Lainnya'] },
        { name: 'Cortez', variants: ['Cortez CE', 'Cortez EX', 'Cortez Varian Lainnya'] },
        { name: 'Formo', variants: ['Formo Blind Van', 'Formo Max Pick Up', 'Formo Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'Varian Lainnya'] },
    ],
    BMW: [
        { name: '1 Series', variants: ['118i Sport Line', '128ti', '1 Series Varian Lainnya'] },
        { name: '3 Series', variants: ['320i Sport', '330i M Sport', '3 Series Varian Lainnya'] },
        { name: '5 Series', variants: ['520i M Sport', '530i Opulence', '5 Series Varian Lainnya'] },
        { name: '7 Series', variants: ['730Li M Sport', '740Li Opulence', '7 Series Varian Lainnya'] },
        { name: 'X1', variants: ['X1 sDrive18i', 'X1 sDrive20i', 'X1 Varian Lainnya'] },
        { name: 'X3', variants: ['X3 sDrive20i', 'X3 xDrive30i', 'X3 Varian Lainnya'] },
        { name: 'X5', variants: ['X5 xDrive40i', 'X5 xDrive45e', 'X5 Varian Lainnya'] },
        { name: 'X6', variants: ['X6 xDrive40i', 'X6 M Competition', 'X6 Varian Lainnya'] },
        { name: 'Z4', variants: ['Z4 sDrive30i', 'Z4 M40i', 'Z4 Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'Varian Lainnya'] },
    ],
    'Mercedes-Benz': [
        { name: 'A-Class', variants: ['A 200 Progressive Line', 'AMG A 35 4MATIC', 'A-Class Varian Lainnya'] },
        { name: 'C-Class', variants: ['C 200 Avantgarde', 'C 300 AMG Line', 'C-Class Varian Lainnya'] },
        { name: 'E-Class', variants: ['E 200 Avantgarde', 'E 300 AMG Line', 'E-Class Varian Lainnya'] },
        { name: 'S-Class', variants: ['S 450 Luxury', 'S 580 4MATIC', 'S-Class Varian Lainnya'] },
        { name: 'GLA', variants: ['GLA 200 Progressive', 'AMG GLA 35 4MATIC', 'GLA Varian Lainnya'] },
        { name: 'GLC', variants: ['GLC 200 AMG Line', 'GLC 300 Coupe', 'GLC Varian Lainnya'] },
        { name: 'GLE', variants: ['GLE 450 AMG Line', 'GLE 53 Coupe', 'GLE Varian Lainnya'] },
        { name: 'GLS', variants: ['GLS 450 AMG Line', 'Maybach GLS 600', 'GLS Varian Lainnya'] },
        { name: 'V-Class', variants: ['V 260 Long', 'V 300 AMG Line', 'V-Class Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'Varian Lainnya'] },
    ],
    Lexus: [
        { name: 'ES', variants: ['ES 300h', 'ES 250 Luxury', 'ES Varian Lainnya'] },
        { name: 'GX', variants: ['GX 460 Luxury', 'GX 550 Overtrail', 'GX Varian Lainnya'] },
        { name: 'IS', variants: ['IS 300h', 'IS 350 F Sport', 'IS Varian Lainnya'] },
        { name: 'LX', variants: ['LX 600', 'LX 600 F Sport', 'LX Varian Lainnya'] },
        { name: 'NX', variants: ['NX 250 Luxury', 'NX 350h Luxury', 'NX Varian Lainnya'] },
        { name: 'RX', variants: ['RX 350 Luxury', 'RX 450h+', 'RX Varian Lainnya'] },
        { name: 'UX', variants: ['UX 200 Luxury', 'UX 300e', 'UX Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'Varian Lainnya'] },
    ],
    Ford: [
        { name: 'Everest', variants: ['Everest Trend 4x2', 'Everest Titanium 4x4', 'Everest Varian Lainnya'] },
        { name: 'Explorer', variants: ['Explorer Limited', 'Explorer ST-Line', 'Explorer Varian Lainnya'] },
        { name: 'Fiesta', variants: ['Fiesta Trend M/T', 'Fiesta Titanium A/T', 'Fiesta Varian Lainnya'] },
        { name: 'Focus', variants: ['Focus Trend', 'Focus Titanium', 'Focus Varian Lainnya'] },
        { name: 'Mustang', variants: ['Mustang EcoBoost', 'Mustang GT', 'Mustang Varian Lainnya'] },
        { name: 'Ranger', variants: ['Ranger XL 4x4', 'Ranger Raptor', 'Ranger Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'Varian Lainnya'] },
    ],
    Chevrolet: [
        { name: 'Captiva', variants: ['Captiva LTZ', 'Captiva Premier', 'Captiva Varian Lainnya'] },
        { name: 'Colorado', variants: ['Colorado LTZ 4x4', 'Colorado High Country', 'Colorado Varian Lainnya'] },
        { name: 'Spark', variants: ['Spark LT M/T', 'Spark LTZ A/T', 'Spark Varian Lainnya'] },
        { name: 'Spin', variants: ['Spin LTZ', 'Spin Activ', 'Spin Varian Lainnya'] },
        { name: 'Trailblazer', variants: ['Trailblazer LT 4x2', 'Trailblazer Z71 4x4', 'Trailblazer Varian Lainnya'] },
        { name: 'Trax', variants: ['Trax LS', 'Trax Premier', 'Trax Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'Varian Lainnya'] },
    ],
    Isuzu: [
        { name: 'D-Max', variants: ['D-Max Single Cabin', 'D-Max Double Cabin V-Cross', 'D-Max Varian Lainnya'] },
        { name: 'Elf', variants: ['Elf NKR 71', 'Elf NLR 55', 'Elf Varian Lainnya'] },
        { name: 'Giga', variants: ['Giga FVR 34', 'Giga FVM 34', 'Giga Varian Lainnya'] },
        { name: 'Mu-X', variants: ['Mu-X LS 4x2', 'Mu-X Royale 4x4', 'Mu-X Varian Lainnya'] },
        { name: 'Panther', variants: ['Panther Smart', 'Panther Grand Touring', 'Panther Varian Lainnya'] },
        { name: 'Traga', variants: ['Traga Pick Up', 'Traga Box', 'Traga Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'Varian Lainnya'] },
    ],
    Hino: [
        { name: '300 Series', variants: ['300 Series Dutro 130 HD', '300 Series Dutro 136 HD', '300 Series Varian Lainnya'] },
        { name: '500 Series', variants: ['500 Series FM 260 JD', '500 Series FG 235 JP', '500 Series Varian Lainnya'] },
        { name: '700 Series', variants: ['700 Series SH 1EER', '700 Series SS 1EK', '700 Series Varian Lainnya'] },
        { name: 'Dutro', variants: ['Dutro 110 LD', 'Dutro 130 HD', 'Dutro Varian Lainnya'] },
        { name: 'Ranger', variants: ['Ranger FG 235 JJ', 'Ranger FM 260 TI', 'Ranger Varian Lainnya'] },
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'Varian Lainnya'] },
    ],
    Lamborghini: [
        { name: 'Aventador', variants: ['Aventador S', 'Aventador SVJ', 'Aventador Varian Lainnya'] },
        { name: 'Countach', variants: ['Countach LPI 800-4', 'Countach 25th Anniversary', 'Countach Varian Lainnya'] },
        { name: 'Diablo', variants: ['Diablo VT', 'Diablo GT', 'Diablo Varian Lainnya'] },
        { name: 'Gallardo', variants: ['Gallardo LP560-4', 'Gallardo Superleggera', 'Gallardo Varian Lainnya'] },
        { name: 'Huracán', variants: ['Huracán EVO', 'Huracán STO', 'Huracán Varian Lainnya'] },
        { name: 'Murciélago', variants: ['Murciélago LP640', 'Murciélago LP670-4 SV', 'Murciélago Varian Lainnya'] },
        { name: 'Urus', variants: ['Urus S', 'Urus Performante', 'Urus Varian Lainnya'] },
    ],
    Ferrari: [
        { name: '296 GTB', variants: ['296 GTB', '296 GTS', '296 Series Varian Lainnya'] },
        { name: '812 Superfast', variants: ['812 Superfast', '812 GTS', '812 Series Varian Lainnya'] },
        { name: 'F8 Tributo', variants: ['F8 Tributo', 'F8 Spider', 'F8 Series Varian Lainnya'] },
        { name: 'Portofino', variants: ['Portofino M', 'Portofino Varian Lainnya', 'Portofino Speciale'] },
        { name: 'Roma', variants: ['Roma', 'Roma Spider', 'Roma Varian Lainnya'] },
        { name: 'SF90 Stradale', variants: ['SF90 Stradale', 'SF90 Spider', 'SF90 Varian Lainnya'] },
    ],
    'Land Rover': [
        { name: 'Defender', variants: ['Defender 90', 'Defender 110', 'Defender Varian Lainnya'] },
        { name: 'Discovery', variants: ['Discovery SE', 'Discovery HSE', 'Discovery Varian Lainnya'] },
        { name: 'Discovery Sport', variants: ['Discovery Sport S', 'Discovery Sport R-Dynamic', 'Discovery Sport Varian Lainnya'] },
        { name: 'Range Rover', variants: ['Range Rover SE', 'Range Rover Autobiography', 'Range Rover Varian Lainnya'] },
        { name: 'Range Rover Evoque', variants: ['Evoque R-Dynamic SE', 'Evoque Autobiography', 'Evoque Varian Lainnya'] },
        { name: 'Range Rover Sport', variants: ['Range Rover Sport SE', 'Range Rover Sport Autobiography', 'Range Rover Sport Varian Lainnya'] },
    ],
    'Range Rover': [
        { name: 'Evoque', variants: ['Evoque R-Dynamic', 'Evoque Autobiography', 'Evoque Varian Lainnya'] },
        { name: 'Range Rover', variants: ['Range Rover SE', 'Range Rover SV', 'Range Rover Varian Lainnya'] },
        { name: 'Range Rover Sport', variants: ['Range Rover Sport Dynamic SE', 'Range Rover Sport Autobiography', 'Range Rover Sport Varian Lainnya'] },
        { name: 'Velar', variants: ['Velar S', 'Velar Dynamic HSE', 'Velar Varian Lainnya'] },
    ],
    Tesla: [
        { name: 'Model 3', variants: ['Model 3 RWD', 'Model 3 Performance', 'Model 3 Varian Lainnya'] },
        { name: 'Model S', variants: ['Model S Dual Motor', 'Model S Plaid', 'Model S Varian Lainnya'] },
        { name: 'Model X', variants: ['Model X Dual Motor', 'Model X Plaid', 'Model X Varian Lainnya'] },
        { name: 'Model Y', variants: ['Model Y RWD', 'Model Y Performance', 'Model Y Varian Lainnya'] },
    ],
    Lainnya: [
        { name: 'Model Lainnya', variants: ['Manual', 'Automatic', 'CVT', 'Varian Lainnya'] },
    ],
};

function cloneBrandModelMap(map) {
    if (!map || typeof map !== 'object') {
        return {};
    }
    const clone = {};
    Object.entries(map).forEach(([brand, entries]) => {
        if (!Array.isArray(entries)) {
            clone[brand] = [];
            return;
        }
        clone[brand] = entries.map((entry) => {
            if (typeof entry === 'string') {
                return entry;
            }
            if (!entry || typeof entry !== 'object') {
                return { name: '' };
            }
            const result = { name: entry.name || '' };
            if (Array.isArray(entry.variants) && entry.variants.length) {
                result.variants = entry.variants.slice();
            }
            return result;
        });
    });
    return clone;
}

(() => {
    class GaragePortal {
        constructor() {
            this.state = {};
            this.currencyFormatter = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            });
            this.customerIndex = new Map();
            this.vehicleIndex = new Map();
            this.vehicleOptionIndex = new Map();
            this.lastPrefilledPlate = null;
            this.customerSearchIndex = new Map();
            this.customerNameMap = new Map();
            this.sparePartIndex = new Map();
            this.sparePartCatalog = [];
            this.filteredSpareParts = [];
            this.currentSparePart = null;
            this.creatingSparePart = false;
            this.defaultBrandModelMap = cloneBrandModelMap(VEHICLE_BRAND_MODELS);
            this.brandModelMap = cloneBrandModelMap(VEHICLE_BRAND_MODELS);
            this.brandModelInitialized = false;
            this.bootstrapRefreshHandle = null;
            this.isPrefilling = false; // ← TAMBAHKAN BARIS INI
            this.manualCustomerQuery = '';
            this.spareRequestGroups = new Map();
            this.lastEstimatePdf = null;
            this.boundSpareRequestModalKeydown = (event) => this.handleSpareRequestModalKeydown(event);
            this.branchPreferenceKey = 'garage.portal.branch';
            this.preferredBranch = '';
            try {
                this.preferredBranch = window.localStorage
                    ? window.localStorage.getItem(this.branchPreferenceKey) || ''
                    : '';
            } catch (error) {
                this.preferredBranch = '';
            }
            this.branchControls = [];
            this.branchDisplays = new Map();
            this.branchLabelMap = new Map();
            this.branchStylesInjected = false;
            this.globalBranchSelect = null;
            this.globalBranchWrapper = null;
            this.branchContainerKind = null;
        }

        init() {
            this.setupGlobalBranchSelector();
            this.cacheDom();
            this.bindEvents();
            this.initRepeaters();
            this.fetchBootstrap(false);
        }

        setupGlobalBranchSelector() {
            if (this.globalBranchSelect && document.body.contains(this.globalBranchSelect)) {
                return this.globalBranchSelect;
            }

            const existing = document.getElementById('portal_branch_selector');
            if (existing) {
                this.globalBranchSelect = existing;
                this.globalBranchWrapper = existing.closest('.portal-branch-switcher');
                this.ensureBranchSwitcherStyles();
                return existing;
            }

            const container = this.findBranchSelectorContainer();
            if (!container) {
                return null;
            }

            this.ensureBranchSwitcherStyles(container);

            const wrapper = this.branchContainerKind === 'list'
                ? document.createElement('li')
                : document.createElement('div');
            wrapper.className =
                this.branchContainerKind === 'list'
                    ? 'portal-branch-switcher portal-branch-switcher--nav'
                    : 'portal-branch-switcher portal-branch-switcher--standalone';

            const label = document.createElement('label');
            label.className = 'portal-branch-switcher__label';
            label.setAttribute('for', 'portal_branch_selector');
            label.textContent = 'Cabang';

            const select = document.createElement('select');
            select.id = 'portal_branch_selector';
            select.className = 'portal-branch-switcher__select';
            select.setAttribute('aria-label', 'Pilih cabang aktif');

            wrapper.appendChild(label);
            wrapper.appendChild(select);

            this.globalBranchWrapper = wrapper;

            if (this.branchContainerKind === 'list') {
                container.insertBefore(wrapper, container.firstChild);
            } else {
                container.appendChild(wrapper);
            }

            this.globalBranchSelect = select;
            return select;
        }

        findBranchSelectorContainer() {
            const navList = document.querySelector('.navbar-nav.navbar-right');
            if (navList) {
                this.branchContainerKind = 'list';
                return navList;
            }
            const navContainer = document.querySelector('.navbar .container');
            if (navContainer) {
                this.branchContainerKind = 'container';
                return navContainer;
            }
            const headerContainer = document.querySelector('.portal-header .container');
            if (headerContainer) {
                this.branchContainerKind = 'container';
                return headerContainer;
            }
            const heroContainer = document.querySelector('.portal-hero--sub .container');
            if (heroContainer) {
                this.branchContainerKind = 'container';
                return heroContainer;
            }
            this.branchContainerKind = null;
            return null;
        }

        ensureBranchSwitcherStyles(container) {
            if (!this.branchStylesInjected) {
                const style = document.createElement('style');
                style.dataset.garageBranchStyles = '1';
                style.textContent = `
                    .portal-branch-switcher {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        color: var(--text-primary, #1a2332);
                        font-family: var(--font-sans, 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
                    }
                    .portal-branch-switcher.is-hidden {
                        display: none !important;
                    }
                    .portal-branch-switcher--standalone {
                        margin-left: auto;
                        padding: 0.25rem 0;
                    }
                    .portal-branch-switcher--nav {
                        padding: 0.5rem 0.75rem;
                    }
                    .portal-branch-switcher__label {
                        font-size: 0.8125rem;
                        font-weight: 600;
                        color: inherit;
                        margin: 0;
                        letter-spacing: -0.01em;
                    }
                    .portal-branch-switcher__select {
                        min-width: 12rem;
                        padding: 0.35rem 2rem 0.35rem 0.75rem;
                        border-radius: 999px;
                        border: 1.5px solid var(--border-base, #d4dae4);
                        background: var(--bg-surface, #ffffff);
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: inherit;
                        box-shadow: none;
                        appearance: none;
                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%235E6C84' d='M6 8 0 0h12z'/%3E%3C/svg%3E");
                        background-repeat: no-repeat;
                        background-position: right 0.75rem center;
                    }
                    .portal-branch-switcher__select:focus {
                        outline: none;
                        border-color: var(--primary, #0066ff);
                        box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.15);
                    }
                    .portal-branch-switcher__select.is-disabled {
                        opacity: 0.7;
                        cursor: not-allowed;
                    }
                    @media (max-width: 767px) {
                        .portal-branch-switcher {
                            width: 100%;
                            justify-content: flex-start;
                        }
                        .portal-branch-switcher__select {
                            width: 100%;
                            min-width: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
                this.branchStylesInjected = true;
            }

            if (container && this.branchContainerKind !== 'list') {
                container.classList.add('portal-navbar-with-branch');
                if (getComputedStyle(container).display !== 'flex') {
                    container.style.display = 'flex';
                    container.style.alignItems = 'center';
                    container.style.gap = '1rem';
                }
            }
        }

        cacheDom() {
            this.forms = {
                intake: document.getElementById('customer-vehicle-form'),
                serviceOrder: document.getElementById('service-order-form'),
                progress: document.getElementById('progress-form'),
                spareOrder: document.getElementById('spare-order-form'),
                procurement: document.getElementById('procurement-form'),
                stockMovement: document.getElementById('stock-movement-form'),
                invoice: document.getElementById('invoice-form'),
                payment: document.getElementById('payment-form'),
                receipt: document.getElementById('receipt-form'),
                sparePartDetail: document.getElementById('spare-detail-form'),
            };

            this.inputs = {
                licensePlate: document.getElementById('license_plate'),
                existingCustomerSearch: document.getElementById('existing_customer_search'),
                newCustomerName: document.getElementById('new_customer_name'),
                spareSearch: document.querySelector('[data-role="spare-search"]'),
            };

            this.datalists = {
                existingCustomer: document.getElementById('existing_customer_options'),
                licensePlates: document.getElementById('license_plate_options'),
            };

            this.selects = {
                existingCustomer: document.getElementById('existing_customer'),
                serviceCustomer: document.getElementById('service_customer'),
                serviceVehicle: document.getElementById('service_vehicle'),
                progressServiceOrder: document.getElementById('progress_service_order'),
                spareCustomer: document.getElementById('spare_customer'),
                invoiceCustomer: document.getElementById('invoice_customer'),
                paymentCustomer: document.getElementById('payment_customer'),
                receiptPaymentEntry: document.getElementById('receipt_payment_entry'),
                intakeBranch: document.getElementById('intake_branch'),
                serviceBranch: document.getElementById('service_branch'),
                spareBranch: document.getElementById('spare_branch'),
                invoiceBranch: document.getElementById('invoice_branch'),
                paymentBranch: document.getElementById('payment_branch'),
                receiptBranch: document.getElementById('receipt_branch'),
                globalBranch: document.getElementById('portal_branch_selector'),
                brand: document.getElementById('brand'),
                model: document.getElementById('model'),
                modelVariant: document.getElementById('model_variant'),
            };

            this.globalBranchSelect = this.selects.globalBranch;
            if (this.globalBranchSelect) {
                this.globalBranchWrapper = this.globalBranchSelect.closest('.portal-branch-switcher');
            }

            this.branchDisplays = new Map();
            document.querySelectorAll('[data-role="branch-display"]').forEach((element) => {
                const target = element.getAttribute('data-target');
                if (target) {
                    this.branchDisplays.set(target, element);
                }
            });

            this.tables = {
                customerVehicles: document.querySelector('[data-role="customer-vehicle-table"]'),
                openService: document.querySelector('[data-role="open-service-table"]'),
                spareOrders: document.querySelector('[data-role="spare-table"]'),
                spareRequests: document.querySelector('[data-role="spare-request-table"]'),
                spareInventory: document.querySelector('[data-role="spare-inventory-table"]'),
                pendingProcurement: document.querySelector('[data-role="pending-procurement-table"]'),
                openInvoices: document.querySelector('[data-role="open-invoice-table"]'),
                payments: document.querySelector('[data-role="payment-table"]'),
            };

            this.emptyStates = {
                customerVehicles: document.querySelector('[data-empty="customer-vehicle"]'),
                openService: document.querySelector('[data-empty="open-service"]'),
                spare: document.querySelector('[data-empty="spare"]'),
                spareRequests: document.querySelector('[data-empty="spare-requests"]'),
                spareInventory: document.querySelector('[data-empty="spare-inventory"]'),
                pendingProcurement: document.querySelector('[data-empty="pending-procurement"]'),
                openInvoice: document.querySelector('[data-empty="open-invoice"]'),
                payment: document.querySelector('[data-empty="payment"]'),
            };

            this.buttons = {
                createSparePart: document.querySelector('[data-action="create-spare-part"]'),
                downloadEstimate: document.querySelector('[data-action="download-estimate"]'),
            };

            this.spareDetail = {
                panel: document.querySelector('[data-role="spare-detail-panel"]'),
                title: document.querySelector('[data-role="spare-detail-title"]'),
                image: document.querySelector('[data-role="spare-preview"]'),
                name: document.querySelector('[data-role="spare-preview-name"]'),
                meta: document.querySelector('[data-role="spare-preview-meta"]'),
                status: document.querySelector('[data-role="spare-status-badge"]'),
            };

            this.lastEstimateServiceOrder = null;
            this.setEstimateDownload(null, { service_order: null });

            this.metrics = {
                serviceEstimate: document.querySelector('[data-metric="service-estimate"]'),
                serviceOpenCount: document.querySelector('[data-metric="service-open-count"]'),
                qcPending: document.querySelector('[data-metric="qc-pending"]'),
                spareCount: document.querySelector('[data-metric="spare-count"]'),
                spareRequestCount: document.querySelector('[data-metric="spare-request-count"]'),
                spareLowStock: document.querySelector('[data-metric="spare-low-stock"]'),
                invoiceTotal: document.querySelector('[data-metric="invoice-total"]'),
                outstandingTotal: document.querySelector('[data-metric="outstanding-total"]'),
                paymentsTotal: document.querySelector('[data-metric="payments-total"]'),
            };

            this.syncBranchSelectReferences();

            this.statusLists = {};
            document.querySelectorAll('[data-status]').forEach((node) => {
                const key = node.getAttribute('data-status');
                if (!this.statusLists[key]) {
                    this.statusLists[key] = [];
                }
                this.statusLists[key].push(node);
            });

            this.refreshButtons = document.querySelectorAll('[data-action="refresh-portal"]');
            this.refreshedAtLabel = document.querySelector('[data-role="refreshed-at"]');
            this.deskLinks = document.querySelectorAll('[data-desk-link]');

            const statusModal = document.getElementById('service-status-modal');
            const spareRequestModal = document.getElementById('spare-request-modal');

            this.modals = {
                status: statusModal,
                spareRequest: spareRequestModal,
            };

            this.statusModal = {
                container: statusModal,
                title: statusModal ? statusModal.querySelector('[data-role="status-modal-title"]') : null,
                summary: statusModal ? statusModal.querySelector('[data-role="status-modal-summary"]') : null,
                tableBody: statusModal ? statusModal.querySelector('[data-role="status-modal-table"]') : null,
                tableWrapper: statusModal ? statusModal.querySelector('[data-role="status-modal-table-wrapper"]') : null,
                emptyState: statusModal ? statusModal.querySelector('[data-role="status-modal-empty"]') : null,
                closeButtons: statusModal ? statusModal.querySelectorAll('[data-role="status-modal-close"]') : [],
            };

            this.spareRequestModal = {
                container: spareRequestModal,
                title: spareRequestModal
                    ? spareRequestModal.querySelector('[data-role="spare-request-modal-title"]')
                    : null,
                summary: spareRequestModal
                    ? spareRequestModal.querySelector('[data-role="spare-request-modal-summary"]')
                    : null,
                list: spareRequestModal
                    ? spareRequestModal.querySelector('[data-role="spare-request-modal-list"]')
                    : null,
                emptyState: spareRequestModal
                    ? spareRequestModal.querySelector('[data-role="spare-request-modal-empty"]')
                    : null,
                closeButtons: spareRequestModal
                    ? spareRequestModal.querySelectorAll('[data-role="spare-request-modal-close"]')
                    : [],
            };
        }

        syncBranchSelectReferences() {
            const controls = [
                this.selects.globalBranch,
                this.selects.intakeBranch,
                this.selects.serviceBranch,
                this.selects.spareBranch,
                this.selects.invoiceBranch,
                this.selects.paymentBranch,
                this.selects.receiptBranch,
            ].filter(Boolean);
            this.branchControls = controls;
            controls.forEach((control) => {
                if (control.tagName === 'SELECT' && !control.dataset.branchListenerAttached) {
                    control.addEventListener('change', () => {
                        this.onBranchChanged(control.value);
                    });
                    control.dataset.branchListenerAttached = '1';
                }
            });
        }

        onBranchChanged(value, options = {}) {
            const normalized = (value || '').trim();
            const { skipFetch = false } = options || {};

            const previous =
                this.state && typeof this.state.active_branch === 'string'
                    ? this.state.active_branch.trim()
                    : '';

            if (normalized) {
                this.preferredBranch = normalized;
                try {
                    if (window.localStorage) {
                        window.localStorage.setItem(this.branchPreferenceKey, normalized);
                    }
                } catch (error) {
                    // ignore persistence failures
                }
            } else {
                this.preferredBranch = '';
                try {
                    if (window.localStorage) {
                        window.localStorage.removeItem(this.branchPreferenceKey);
                    }
                } catch (error) {
                    // ignore persistence failures
                }
            }

            if (this.state && typeof this.state === 'object') {
                this.state.active_branch = normalized;
            }

            (this.branchControls || []).forEach((control) => {
                if (!control) {
                    return;
                }
                if (control.tagName === 'SELECT') {
                    if (control.value !== normalized) {
                        this.setSelectValue(control, normalized);
                    }
                } else if ('value' in control && control.value !== normalized) {
                    control.value = normalized;
                }
            });

            this.updateBranchDisplays(normalized);

            if (!skipFetch && normalized && normalized !== previous) {
                this.fetchBootstrap(false);
            }

            try {
                document.dispatchEvent(
                    new CustomEvent('garage-portal:branch-changed', {
                        detail: { branch: normalized },
                    })
                );
            } catch (error) {
                // Ignore event dispatch failures
            }
        }

        updateBranchSelects() {
            this.syncBranchSelectReferences();
            const branches = this.asArray(this.state.branches);
            const branchOptions = branches.map((branch) => ({
                ...branch,
                display_label: this.formatBranchLabel(branch),
            }));

            const labelMap = new Map();
            branchOptions.forEach((branch) => {
                if (branch && branch.name) {
                    labelMap.set(branch.name, branch.display_label);
                }
            });
            this.branchLabelMap = labelMap;

            if (this.selects.globalBranch) {
                this.populateSelect(this.selects.globalBranch, branchOptions, {
                    valueKey: 'name',
                    labelKey: 'display_label',
                    blankLabel: branchOptions.length > 1 ? '— Pilih cabang —' : 'Tidak ada cabang',
                });
                const disabled = branchOptions.length <= 1;
                this.selects.globalBranch.disabled = disabled;
                this.selects.globalBranch.classList.toggle('is-disabled', disabled);
                if (this.globalBranchWrapper) {
                    this.globalBranchWrapper.classList.toggle('is-hidden', disabled);
                }
                if (disabled) {
                    this.selects.globalBranch.setAttribute('title', 'Anda hanya memiliki akses ke satu cabang.');
                } else {
                    this.selects.globalBranch.removeAttribute('title');
                }
            }

            [
                this.selects.intakeBranch,
                this.selects.serviceBranch,
                this.selects.spareBranch,
                this.selects.invoiceBranch,
                this.selects.paymentBranch,
                this.selects.receiptBranch,
            ]
                .filter(Boolean)
                .forEach((control) => {
                    if (!control) {
                        return;
                    }
                    if (control.tagName === 'SELECT') {
                        this.populateSelect(control, branchOptions, {
                            valueKey: 'name',
                            labelKey: 'display_label',
                            blankLabel: '— Pilih cabang —',
                        });
                    } else if ('value' in control) {
                        control.value = '';
                    }
                });

            const available = new Set(branches.map((branch) => branch.name).filter(Boolean));
            const serverBranch =
                this.state && typeof this.state.active_branch === 'string'
                    ? this.state.active_branch.trim()
                    : '';
            let defaultBranch = '';
            if (serverBranch && available.has(serverBranch)) {
                defaultBranch = serverBranch;
            } else if (this.preferredBranch && available.has(this.preferredBranch)) {
                defaultBranch = this.preferredBranch;
            } else if (branches.length) {
                defaultBranch = branches[0].name || '';
            }
            if (this.state && typeof this.state === 'object') {
                this.state.active_branch = defaultBranch;
            }
            this.onBranchChanged(defaultBranch, { skipFetch: true });
        }

        formatBranchLabel(branch) {
            if (!branch || typeof branch !== 'object') {
                return '';
            }
            const code = (branch.branch_code || '').toString().trim();
            const name = (branch.branch_name || branch.name || '').toString().trim();
            if (code && name) {
                return `${code} — ${name}`;
            }
            return name || code || '';
        }

        getBranchDisplayLabel(branchName) {
            if (!branchName) {
                return '—';
            }
            return this.branchLabelMap.get(branchName) || branchName || '—';
        }

        updateBranchDisplays(branchName) {
            const label = this.getBranchDisplayLabel(branchName);
            if (!(this.branchDisplays instanceof Map)) {
                return;
            }
            this.branchDisplays.forEach((element) => {
                if (element) {
                    element.textContent = label || '—';
                }
            });
        }

        bindEvents() {
            if (this.forms.intake) {
                this.setupBrandModelControls();
                
                // PATCH: Improved submit handler
                this.forms.intake.addEventListener('submit', (event) => {
                    event.preventDefault();
                    
                    // Get all required fields
                    const customerNameField = this.forms.intake.querySelector('[name="customer_name"]');
                    const newCustomerNameField = this.inputs.newCustomerName;
                    const existingCustomerSelect = this.selects.existingCustomer;
                    
                    // Ensure customer_name is populated
                    if (customerNameField) {
                        const selectedExisting = existingCustomerSelect?.value?.trim();
                        
                        if (selectedExisting) {
                            // Use existing customer
                            const selectedOption = existingCustomerSelect.options[existingCustomerSelect.selectedIndex];
                            customerNameField.value = selectedOption?.text || selectedExisting;
                        } else if (newCustomerNameField) {
                            // Use new customer name
                            const newName = (newCustomerNameField.value || '').trim();
                            if (newName) {
                                customerNameField.value = newName;
                            }
                        }
                        
                        // Validate customer_name is not empty
                        if (!customerNameField.value || !customerNameField.value.trim()) {
                            frappe.show_alert({
                                message: 'Mohon isi nama customer atau pilih customer eksisting.',
                                indicator: 'red'
                            });
                            
                            if (newCustomerNameField) {
                                newCustomerNameField.focus();
                            }
                            
                            return; // Stop submission
                        }
                    }

                    if (this.inputs.newCustomerName && this.forms.intake) {
                        this.inputs.newCustomerName.addEventListener('input', (event) => {
                            const customerNameField = this.forms.intake.querySelector('[name="customer_name"]');
                            if (customerNameField) {
                                customerNameField.value = event.target.value.trim();
                            }
                        });
                    }
                    
                    // Collect form data
                    const payload = this.collectFormData(this.forms.intake, [
                        'existing_customer',
                        'existing_customer_search',
                        'customer_type',
                        'new_customer_name',
                        'customer_name',
                        'branch',
                        'phone',
                        'email',
                        'preferred_contact_method',
                        'is_vip',
                        'marketing_source',
                        'license_plate',
                        'brand',
                        'type_model',
                        'model',
                        'model_variant',
                        'vehicle_year',
                        'color',
                        'transmission',
                        'fuel_type',
                        'mileage',
                        'vin',
                        'engine_number',
                        'service_order_type',
                        'priority',
                        'service_bundle',
                        'total_estimated_amount',
                        'notes',
                        'intake_type',
                    ]);
                    
                    this.submitForm(
                        this.forms.intake,
                        'garage.api.portal.register_customer_vehicle',
                        { payload },
                        'Data intake tersimpan.',
                        {
                            onSuccess: (response) => {
                                const pdf = response?.message?.estimate_pdf;
                                const serviceOrder = response?.message?.created?.service_order || null;
                                this.setEstimateDownload(pdf, { service_order: serviceOrder });
                                
                                if (pdf?.content) {
                                    // Try auto-download
                                    try {
                                        this.downloadBase64File(
                                            pdf.content,
                                            pdf.filename || 'estimasi-service.pdf',
                                            pdf.mime_type || 'application/pdf'
                                        );
                                        
                                        // Show success with manual download button
                                        setTimeout(() => {
                                            frappe.msgprint({
                                                title: __('PDF Estimasi Berhasil Dibuat'),
                                                indicator: 'green',
                                                message: `
                                                    <div style="margin-bottom: 15px;">
                                                        <p>PDF estimasi service <strong>${pdf.filename || 'estimasi-service.pdf'}</strong> berhasil dibuat.</p>
                                                    </div>
                                                    <div style="margin-bottom: 10px;">
                                                        <strong>Jika download tidak dimulai otomatis:</strong>
                                                    </div>
                                                    <ol style="margin-left: 20px;">
                                                        <li>Klik tombol "Download PDF" di bawah, ATAU</li>
                                                        <li>Klik tombol "Download Estimasi" di atas form</li>
                                                    </ol>
                                                `,
                                                primary_action: {
                                                    label: __('Download PDF'),
                                                    action: () => {
                                                        this.downloadBase64File(
                                                            pdf.content,
                                                            pdf.filename || 'estimasi-service.pdf',
                                                            pdf.mime_type || 'application/pdf'
                                                        );
                                                    }
                                                }
                                            });
                                        }, 500); // Delay 500ms agar auto-download sempat jalan dulu
                                        
                                    } catch (error) {
                                        console.error('Auto-download error:', error);
                                        
                                        // If auto-download fails, force show manual download dialog
                                        frappe.msgprint({
                                            title: __('Download Estimasi Service'),
                                            indicator: 'orange',
                                            message: `
                                                <div style="margin-bottom: 15px;">
                                                    <p><strong>Browser Anda memblokir auto-download.</strong></p>
                                                    <p>Silakan klik tombol di bawah untuk download manual:</p>
                                                </div>
                                            `,
                                            primary_action: {
                                                label: __('Download PDF Sekarang'),
                                                action: () => {
                                                    this.downloadBase64File(
                                                        pdf.content,
                                                        pdf.filename || 'estimasi-service.pdf',
                                                        pdf.mime_type || 'application/pdf'
                                                    );
                                                }
                                            }
                                        });
                                    }
                                    
                                } else if (response?.message?.created?.service_order) {
                                    frappe.show_alert({
                                        message: __('File estimasi belum berhasil dibuat. Coba simpan ulang atau hubungi admin.'),
                                        indicator: 'orange',
                                    });
                                }
                            },
                        }
                    );
                });
                
                const scheduleRefresh = () => this.scheduleBootstrapRefresh();
                this.forms.intake.addEventListener('change', scheduleRefresh);
                this.forms.intake.addEventListener('input', scheduleRefresh);
            }

            if (this.forms.serviceOrder) {
                this.forms.serviceOrder.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.serviceOrder, [
                        'branch',
                        'service_order_type',
                        'order_category',
                        'priority',
                        'customer',
                        'vehicle',
                        'service_advisor',
                        'estimated_delivery_date',
                        'total_estimated_amount',
                        'inspection_summary',
                        'service_notes',
                    ]);
                    this.submitForm(this.forms.serviceOrder, 'garage.api.portal.create_service_order', { order: payload }, 'Service order berhasil dibuat.');
                });
            }

            if (this.forms.progress) {
                this.forms.progress.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const name = this.forms.progress.querySelector('[name="name"]').value;
                    if (!name) {
                        frappe.msgprint(__('Pilih service order terlebih dahulu.'));
                        return;
                    }
                    const payload = this.collectFormData(this.forms.progress, [
                        'log_date',
                        'status',
                        'technician',
                        'percent_complete',
                        'progress_notes',
                    ]);
                    this.submitForm(
                        this.forms.progress,
                        'garage.api.portal.append_service_progress',
                        { name, log_entry: payload },
                        'Progres servis ditambahkan.'
                    );
                });
            }

            if (this.forms.spareOrder) {
                this.forms.spareOrder.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.spareOrder, [
                        'branch',
                        'customer',
                        'order_date',
                        'pickup_method',
                        'delivery_date',
                        'warehouse',
                        'total_amount',
                        'notes',
                    ]);
                    this.submitForm(this.forms.spareOrder, 'garage.api.portal.create_spare_part_order', { order: payload }, 'Order sparepart dibuat.');
                });
            }

            if (this.forms.sparePartDetail) {
                this.forms.sparePartDetail.addEventListener('submit', (event) => {
                    event.preventDefault();
                    this.submitSparePartDetail();
                });
            }

            if (this.forms.procurement) {
                this.forms.procurement.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.procurement, [
                        'reference_type',
                        'reference_name',
                        'supplier',
                        'order_date',
                        'expected_date',
                        'total_qty',
                        'total_amount',
                        'remarks',
                    ]);
                    this.submitForm(this.forms.procurement, 'garage.api.portal.create_procurement_order', { order: payload }, 'Procurement order disimpan.');
                });
            }

            if (this.forms.stockMovement) {
                this.forms.stockMovement.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.stockMovement, [
                        'movement_type',
                        'reference_type',
                        'reference_name',
                        'posting_date',
                        'posting_time',
                        'warehouse',
                        'remarks',
                    ]);
                    this.submitForm(this.forms.stockMovement, 'garage.api.portal.create_stock_movement', { movement: payload }, 'Mutasi stok tersimpan.');
                });
            }

            if (this.forms.invoice) {
                this.forms.invoice.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.invoice, [
                        'branch',
                        'customer',
                        'invoice_date',
                        'source_type',
                        'source_name',
                        'due_date',
                        'total_amount',
                        'notes',
                    ]);
                    this.submitForm(this.forms.invoice, 'garage.api.portal.create_sales_invoice', { invoice: payload }, 'Invoice berhasil dibuat.');
                });
            }

            if (this.forms.payment) {
                this.forms.payment.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.payment, [
                        'branch',
                        'customer',
                        'payment_date',
                        'mode_of_payment',
                        'reference_no',
                        'reference_date',
                        'paid_amount',
                        'received_amount',
                        'notes',
                    ]);
                    this.submitForm(this.forms.payment, 'garage.api.portal.create_payment_entry', { entry: payload }, 'Payment entry tersimpan.');
                });
            }

            if (this.forms.receipt) {
                this.forms.receipt.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const payload = this.collectFormData(this.forms.receipt, [
                        'branch',
                        'payment_entry',
                        'receipt_date',
                        'receipt_number',
                        'delivery_method',
                        'issued_by',
                        'notes',
                    ]);
                    this.submitForm(this.forms.receipt, 'garage.api.portal.create_receipt_document', { receipt: payload }, 'Receipt berhasil dibuat.');
                });
            }

            if (this.selects.existingCustomer) {
                this.selects.existingCustomer.addEventListener('change', () => {
                    this.applyExistingCustomerSelection();
                });
            }

            if (this.inputs.existingCustomerSearch) {
                this.inputs.existingCustomerSearch.addEventListener('change', () => {
                    this.handleExistingCustomerSearch();
                });
                this.inputs.existingCustomerSearch.addEventListener('input', (event) => {
                    const rawValue = event.target.value || '';
                    const nameField = this.forms.intake?.querySelector('[name="customer_name"]');
                    if (rawValue) {
                        this.manualCustomerQuery = '';
                        if (nameField) {
                            nameField.value = '';
                        }
                        if (this.inputs.newCustomerName) {
                            this.inputs.newCustomerName.value = '';
                        }
                    } else {
                        if (nameField) {
                            nameField.value = this.manualCustomerQuery || '';
                        }
                        if (this.inputs.newCustomerName) {
                            this.inputs.newCustomerName.value = this.manualCustomerQuery || '';
                        }
                        if (this.selects.existingCustomer) {
                            this.setSelectValue(this.selects.existingCustomer, '');
                            this.applyExistingCustomerSelection();
                        }
                    }
                });
            }

            if (this.inputs.newCustomerName) {
                this.inputs.newCustomerName.addEventListener('input', (event) => {
                    const rawValue = event.target.value || '';
                    const trimmed = rawValue.trim();
                    this.manualCustomerQuery = trimmed;
                    const nameField = this.forms.intake?.querySelector('[name="customer_name"]');
                    if (nameField) {
                        nameField.value = trimmed;
                    }
                    if (this.inputs.existingCustomerSearch) {
                        this.inputs.existingCustomerSearch.value = '';
                    }
                    if (this.selects.existingCustomer) {
                        this.setSelectValue(this.selects.existingCustomer, '');
                    }
                });
            }

            if (this.inputs.spareSearch) {
                this.inputs.spareSearch.addEventListener('input', (event) => {
                    this.applySpareSearch(event.target.value || '');
                });
            }

            if (this.buttons.createSparePart) {
                this.buttons.createSparePart.addEventListener('click', () => {
                    this.startCreateSparePart();
                });
            }

            if (this.buttons.downloadEstimate) {
                this.buttons.downloadEstimate.addEventListener('click', () => {
                    this.handleEstimateDownload();
                });
            }

            if (this.tables.spareInventory) {
                this.tables.spareInventory.addEventListener('click', (event) => {
                    const row = event.target.closest('tr[data-part-name]');
                    if (row) {
                        this.selectSparePart(row.getAttribute('data-part-name'));
                    }
                });
            }

            if (this.inputs.licensePlate) {
                this.inputs.licensePlate.addEventListener('change', () => {
                    this.handleLicensePlateChange();
                });
            }

            if (this.selects.serviceCustomer) {
                this.selects.serviceCustomer.addEventListener('change', () => {
                    this.updateServiceVehicleOptions();
                });
            }

            this.refreshButtons.forEach((button) => {
                button.addEventListener('click', () => this.fetchBootstrap());
            });

            if (this.spareRequestModal?.closeButtons?.length) {
                this.spareRequestModal.closeButtons.forEach((button) => {
                    button.addEventListener('click', () => this.closeSpareRequestDetail());
                });
            }

            if (this.spareRequestModal?.container) {
                this.spareRequestModal.container.addEventListener('click', (event) => {
                    if (event.target === this.spareRequestModal.container) {
                        this.closeSpareRequestDetail();
                    }
                });
            }

            if (this.statusModal?.closeButtons) {
                this.statusModal.closeButtons.forEach((button) => {
                    button.addEventListener('click', () => this.closeStatusModal());
                });
            }

            if (this.statusModal?.container) {
                this.statusModal.container.addEventListener('click', (event) => {
                    if (event.target === this.statusModal.container) {
                        this.closeStatusModal();
                    }
                });
            }
        }

        applyExistingCustomerSelection() {
            const select = this.selects.existingCustomer;
            if (!select) {
                return;
            }
            const value = select.value;
            if (!value) {
                this.updateCustomerSearchInput(null);
                return;
            }
            const customer = this.customerIndex.get(value);
            if (customer && !this.isCustomerProfileIncomplete(customer)) {
                this.manualCustomerQuery = '';
                if (this.inputs.newCustomerName) {
                    this.inputs.newCustomerName.value = '';
                }
                this.prefillCustomerFields(customer);
                this.updateCustomerSearchInput(customer);
            } else {
                this.fetchCustomerDetailsByName(value);
            }
        }

        handleLicensePlateChange() {
            if (!this.inputs.licensePlate) {
                return;
            }
            const rawValue = this.inputs.licensePlate.value || '';
            const normalized = this.normalizeLicensePlate(rawValue);
            if (!normalized) {
                this.lastPrefilledPlate = null;
                return;
            }
            const vehicle = this.vehicleIndex.get(normalized);
            if (!vehicle) {
                this.fetchVehicleByPlate(normalized, rawValue);
                return;
            }
            const previousPrefilled = this.lastPrefilledPlate;
            this.lastPrefilledPlate = normalized;
            this.prefillVehicleFields(vehicle);
            if (vehicle.customer && this.selects.existingCustomer) {
                const set = this.setSelectValue(this.selects.existingCustomer, vehicle.customer);
                if (set) {
                    this.applyExistingCustomerSelection();
                } else {
                    const existing = this.customerIndex.get(vehicle.customer);
                    if (existing) {
                        this.ensureCustomerOptions(vehicle.customer, existing.customer_name || vehicle.customer);
                        this.setSelectValue(this.selects.existingCustomer, vehicle.customer);
                        this.prefillCustomerFields(existing);
                    }
                }
            } else if (this.selects.existingCustomer) {
                this.setSelectValue(this.selects.existingCustomer, '');
            }
            if (window.frappe && frappe.show_alert && previousPrefilled !== normalized) {
                frappe.show_alert({
                    message: __('Data kendaraan ditemukan dan terisi otomatis.'),
                    indicator: 'green',
                });
            }
        }

        fetchVehicleByPlate(normalized, rawValue) {
            if (!normalized) {
                return;
            }
            if (!window.frappe || !frappe.call) {
                this.lastPrefilledPlate = null;
                this.clearVehicleCustomerSelection();
                this.notifyPlateNotFound();
                return;
            }
            frappe.call({
                method: 'garage.api.portal.lookup_vehicle_by_plate',
                args: { license_plate: rawValue },
                callback: (response) => {
                    const data = response?.message || {};
                    const vehicle = data.vehicle;
                    if (!vehicle) {
                        this.lastPrefilledPlate = null;
                        this.notifyPlateNotFound();
                        return;
                    }
                    const previousPrefilled = this.lastPrefilledPlate;
                    this.registerVehicleData(vehicle, { refreshBrandOptions: true });
                    this.lastPrefilledPlate = normalized;
                    this.prefillVehicleFields(vehicle);
                    const customerName = vehicle.customer;
                    const customer = data.customer || (customerName ? this.customerIndex.get(customerName) : null);
                    if (customerName) {
                        if (customer) {
                            this.registerCustomerData(customer);
                            this.prefillCustomerFields(customer);
                            this.ensureLicensePlateOption(vehicle);
                        } else {
                            this.ensureCustomerOptions(customerName, customerName);
                        }
                        if (this.selects.existingCustomer) {
                            const didSet = this.setSelectValue(this.selects.existingCustomer, customerName);
                            if (didSet) {
                                this.applyExistingCustomerSelection();
                            }
                        }
                    } else {
                        if (this.selects.existingCustomer) {
                            this.setSelectValue(this.selects.existingCustomer, '');
                        }
                    }
                    if (window.frappe && frappe.show_alert && previousPrefilled !== normalized) {
                        frappe.show_alert({
                            message: __('Data kendaraan ditemukan dan terisi otomatis.'),
                            indicator: 'green',
                        });
                    }
                },
                error: () => {
                    this.lastPrefilledPlate = null;
                    this.notifyPlateNotFound();
                },
            });
        }

        prefillVehicleFields(vehicle) {
            const form = this.forms.intake;
            if (!form) {
                return;
            }
            
            // ✅ SET FLAG: Sedang melakukan prefill
            this.isPrefilling = true;
            
            try {
                // 1. Prefill license plate
                if (this.inputs.licensePlate && vehicle.license_plate) {
                    this.inputs.licensePlate.value = vehicle.license_plate;
                }
                
                // 2. Prefill brand, model, dan variant
                const brandSelect = this.selects.brand;
                const modelSelect = this.selects.model;
                const variantSelect = this.selects.modelVariant;
                const variantValue = vehicle.model_variant || '';
                
                if (brandSelect) {
                    const brandValue = vehicle.brand || '';
                    const modelValue = vehicle.model || '';
                    
                    // Step 1: Populate brand options dan set value
                    this.populateBrandOptions(brandValue);
                    this.setSelectValue(brandSelect, brandValue);
                    
                    // Step 2: Populate model options (ini akan otomatis populate variant juga)
                    this.populateModelOptions(brandValue, modelValue, variantValue);
                    
                    // ✅ PERBAIKAN: Explicitly set model value lagi untuk memastikan
                    if (modelValue) {
                        const modelSet = this.setSelectValue(modelSelect, modelValue);
                        if (!modelSet) {
                            // Jika gagal set, tambahkan option dulu
                            this.addOptionIfMissing(modelSelect, modelValue, modelValue);
                            this.setSelectValue(modelSelect, modelValue);
                        }
                    }
                    
                    // ✅ PERBAIKAN: Explicitly set variant value juga
                    if (variantSelect && variantValue) {
                        const variantSet = this.setSelectValue(variantSelect, variantValue);
                        if (!variantSet) {
                            // Jika gagal set, tambahkan option dulu
                            this.addOptionIfMissing(variantSelect, variantValue, variantValue);
                            this.setSelectValue(variantSelect, variantValue);
                        }
                    }
                    
                } else if (modelSelect) {
                    // Jika tidak ada brandSelect, langsung populate model
                    this.populateModelOptions('', vehicle.model || '', variantValue);
                }
                
                // 3. Pastikan type_model juga di-set
                const typeModelField = form.querySelector('[name="type_model"]');
                if (typeModelField && vehicle.type_model) {
                    if (typeModelField.tagName === 'SELECT') {
                        this.addOptionIfMissing(typeModelField, vehicle.type_model, vehicle.type_model);
                        this.setSelectValue(typeModelField, vehicle.type_model);
                    } else {
                        typeModelField.value = vehicle.type_model;
                    }
                }
                
                // 4. Prefill field-field lainnya
                const mapping = {
                    vehicle_year: 'vehicle_year',
                    color: 'color',
                    transmission: 'transmission',
                    fuel_type: 'fuel_type',
                    mileage: 'mileage',
                    vin: 'vin',
                    engine_number: 'engine_number',
                };
                
                Object.entries(mapping).forEach(([fieldName, sourceKey]) => {
                    const field = form.querySelector(`[name="${fieldName}"]`);
                    if (!field) {
                        return;
                    }
                    const value = vehicle[sourceKey];
                    if (field.tagName === 'SELECT') {
                        this.setSelectValue(field, value);
                    } else {
                        field.value = value !== undefined && value !== null ? value : '';
                    }
                });
                
            } finally {
                // ✅ RESET FLAG: Selesai melakukan prefill
                setTimeout(() => {
                    this.isPrefilling = false;
                    
                    // Debug logging (optional, bisa dihapus di production)
                    if (typeof console !== 'undefined') {
                        const brandSelect = this.selects.brand;
                        const modelSelect = this.selects.model;
                        const variantSelect = this.selects.modelVariant;
                        
                        console.log('✓ Prefill completed:', {
                            brand: brandSelect?.value || 'EMPTY',
                            model: modelSelect?.value || 'EMPTY',
                            modelOptions: modelSelect ? Array.from(modelSelect.options).map(o => o.value) : [],
                            variant: variantSelect?.value || 'EMPTY',
                            variantOptions: variantSelect ? Array.from(variantSelect.options).map(o => o.value) : []
                        });
                    }
                }, 100);
            }
        }

        prefillCustomerFields(customer) {
            const form = this.forms.intake;
            if (!form) {
                return;
            }
            const mapping = {
                customer_name: 'customer_name',
                customer_type: 'customer_type',
                phone: 'phone',
                email: 'email',
                preferred_contact_method: 'preferred_contact_method',
                marketing_source: 'marketing_source',
            };
            Object.entries(mapping).forEach(([fieldName, sourceKey]) => {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (!field) {
                    return;
                }
                const value = customer[sourceKey];
                if (field.tagName === 'SELECT') {
                    if (!this.setSelectValue(field, value)) {
                        if (field.options && field.options.length) {
                            field.value = field.options[0].value;
                        }
                    }
                } else {
                    field.value = value ?? '';
                    if (fieldName === 'customer_name' && this.inputs.existingCustomerSearch) {
                        this.inputs.existingCustomerSearch.value = this.formatCustomerSearchLabel(customer);
                    }
                }
            });
            const vipField = form.querySelector('[name="is_vip"]');
            if (vipField) {
                const vipValue = customer.is_vip ? '1' : '0';
                this.setSelectValue(vipField, vipValue);
            }
        }

        registerVehicleData(vehicle, options = {}) {
            if (!vehicle) {
                return;
            }
            const normalized = this.normalizeLicensePlate(vehicle.license_plate);
            if (!normalized) {
                return;
            }
            this.vehicleIndex.set(normalized, vehicle);
            this.ensureLicensePlateOption(vehicle);

            const updatedBrandMap = this.integrateBrandModelFromVehicle(vehicle);
            if (updatedBrandMap && options.refreshBrandOptions) {
                this.refreshBrandModelOptions();
            }
        }

        integrateBrandModelFromVehicle(vehicle) {
            if (!vehicle) {
                return false;
            }
            const brand = (vehicle.brand || '').trim();
            if (!brand) {
                return false;
            }

            if (!this.brandModelMap || typeof this.brandModelMap !== 'object') {
                this.brandModelMap = cloneBrandModelMap(this.defaultBrandModelMap || {});
            }

            const map = this.brandModelMap;
            const entries = Array.isArray(map[brand]) ? map[brand].slice() : [];
            const variant = (vehicle.model_variant || '').trim();
            let changed = false;

            const candidates = [vehicle.model, vehicle.type_model]
                .map((value) => (value || '').trim())
                .filter((value, index, array) => value && array.indexOf(value) === index);

            if (!candidates.length) {
                map[brand] = entries;
                return false;
            }

            const ensureEntry = (modelName) => {
                if (!modelName) {
                    return;
                }
                const existingIndex = entries.findIndex((entry) =>
                    typeof entry === 'string' ? entry === modelName : entry?.name === modelName
                );

                if (existingIndex === -1) {
                    if (variant) {
                        entries.push({ name: modelName, variants: [variant] });
                    } else {
                        entries.push({ name: modelName });
                    }
                    changed = true;
                    return;
                }

                const existingEntry = entries[existingIndex];
                if (typeof existingEntry === 'string') {
                    if (variant) {
                        entries[existingIndex] = { name: modelName, variants: [variant] };
                        changed = true;
                    }
                    return;
                }

                if (!variant) {
                    return;
                }

                const variants = Array.isArray(existingEntry.variants)
                    ? existingEntry.variants.slice()
                    : [];
                if (!variants.includes(variant)) {
                    variants.push(variant);
                    entries[existingIndex] = variants.length
                        ? { name: modelName, variants }
                        : { name: modelName };
                    changed = true;
                }
            };

            candidates.forEach((modelName) => ensureEntry(modelName));
            map[brand] = entries;

            return changed;
        }

        refreshBrandModelOptions() {
            const brandSelect = this.selects.brand;
            const modelSelect = this.selects.model;
            if (!brandSelect || !modelSelect) {
                return;
            }

            const variantSelect = this.selects.modelVariant;
            const brandValue = brandSelect.value || brandSelect.getAttribute('data-pending-value') || '';
            const modelValue = modelSelect.value || modelSelect.getAttribute('data-pending-value') || '';
            const variantValue = variantSelect
                ? variantSelect.value || variantSelect.getAttribute('data-pending-value') || ''
                : '';

            this.populateBrandOptions(brandValue);
            this.populateModelOptions(brandValue, modelValue, variantValue);
        }

        ensureLicensePlateOption(vehicle) {
            const datalist = this.datalists?.licensePlates;
            if (!datalist || !vehicle || !vehicle.license_plate) {
                return;
            }
            const normalized = this.normalizeLicensePlate(vehicle.license_plate);
            if (!normalized) {
                return;
            }
            const label = this.formatVehicleOptionLabel(vehicle);
            let option = this.vehicleOptionIndex.get(normalized);
            if (!option) {
                option = document.createElement('option');
                option.dataset.plate = normalized;
                datalist.appendChild(option);
                this.vehicleOptionIndex.set(normalized, option);
            }
            option.value = vehicle.license_plate;
            option.label = label;
            option.textContent = label;
        }

        formatVehicleOptionLabel(vehicle) {
            if (!vehicle) {
                return '';
            }
            const plate = vehicle.license_plate || '';
            const explicitName = vehicle.customer_name || vehicle.customer_display_name;
            const customerName = explicitName || this.lookupCustomerDisplayName(vehicle.customer);
            if (customerName) {
                return `${plate} — ${customerName}`;
            }
            return plate;
        }

        lookupCustomerDisplayName(customerName) {
            if (!customerName) {
                return '';
            }
            const customer = this.customerIndex.get(customerName);
            if (!customer) {
                return customerName;
            }
            return customer.customer_name || customer.name || customerName;
        }

        registerCustomerData(customer, { updateSelect = true } = {}) {
            if (!customer || !customer.name) {
                return;
            }
            this.customerIndex.set(customer.name, customer);
            const nameKey = (customer.customer_name || '').trim().toLowerCase();
            if (nameKey) {
                this.customerNameMap.set(nameKey, customer.name);
            }
            const label = this.formatCustomerSearchLabel(customer);
            if (label) {
                this.customerSearchIndex.set(label, customer.name);
                const datalist = this.datalists?.existingCustomer;
                if (datalist) {
                    const hasOption = Array.from(datalist.querySelectorAll('option')).some(
                        (option) => option.value === label
                    );
                    if (!hasOption) {
                        const option = document.createElement('option');
                        option.value = label;
                        datalist.appendChild(option);
                    }
                }
            }
            if (updateSelect) {
                this.ensureCustomerOptions(customer.name, customer.customer_name || customer.name);
            }
        }

        isCustomerProfileIncomplete(customer) {
            if (!customer) {
                return true;
            }
            const requiredKeys = [
                'customer_name',
                'customer_type',
                'phone',
                'email',
                'preferred_contact_method',
                'marketing_source',
                'is_vip',
            ];
            return requiredKeys.some((key) => !(key in customer));
        }

        fetchCustomerDetailsByName(name) {
            if (!name) {
                this.updateCustomerSearchInput(null);
                return;
            }
            if (!window.frappe || !frappe.call) {
                this.updateCustomerSearchInput(null);
                this.notifyCustomerNotFound();
                return;
            }
            frappe.call({
                method: 'garage.api.portal.lookup_customer',
                args: { name },
                callback: (response) => {
                    const data = response?.message || {};
                    const customer = data.customer;
                    if (!customer) {
                        this.notifyCustomerNotFound();
                        return;
                    }
                    this.registerCustomerData(customer);
                    if (Array.isArray(data.vehicles)) {
                        data.vehicles.forEach((vehicle) => this.registerVehicleData(vehicle));
                        this.refreshBrandModelOptions();
                    }
                    this.prefillCustomerFields(customer);
                    this.updateCustomerSearchInput(customer);
                },
                error: () => {
                    this.notifyCustomerNotFound();
                },
            });
        }

        rebuildCustomerSearch(customers) {
            this.customerNameMap = new Map();
            this.customerSearchIndex = new Map();
            const datalist = this.datalists?.existingCustomer;
            if (datalist) {
                datalist.innerHTML = '';
            }
            (customers || []).forEach((customer) => {
                if (!customer) {
                    return;
                }
                const nameKey = (customer.customer_name || '').trim().toLowerCase();
                if (nameKey) {
                    this.customerNameMap.set(nameKey, customer.name);
                }
                const label = this.formatCustomerSearchLabel(customer);
                if (label) {
                    this.customerSearchIndex.set(label, customer.name);
                    if (datalist) {
                        const option = document.createElement('option');
                        option.value = label;
                        datalist.appendChild(option);
                    }
                }
            });
        }

        formatCustomerSearchLabel(customer) {
            if (!customer) {
                return '';
            }
            const name = customer.customer_name || customer.name || '';
            const contact = [customer.phone, customer.email].filter(Boolean).join(' / ');
            return contact ? `${name} · ${contact}` : name;
        }

        updateCustomerSearchInput(customer) {
            if (customer) {
                this.manualCustomerQuery = '';
            }
            if (this.inputs.existingCustomerSearch) {
                if (customer) {
                    this.inputs.existingCustomerSearch.value = this.formatCustomerSearchLabel(customer);
                } else {
                    this.inputs.existingCustomerSearch.value = '';
                }
            }
            if (this.inputs.newCustomerName) {
                if (customer) {
                    this.inputs.newCustomerName.value = '';
                } else {
                    this.inputs.newCustomerName.value = this.manualCustomerQuery || '';
                }
            }
            const nameField = this.forms.intake?.querySelector('[name="customer_name"]');
            if (nameField) {
                if (customer) {
                    nameField.value = customer.customer_name || customer.name || '';
                } else {
                    nameField.value = this.manualCustomerQuery || '';
                }
            }
        }

        handleExistingCustomerSearch() {
            const input = this.inputs.existingCustomerSearch;
            if (!input) {
                return;
            }
            const raw = input.value || '';
            const query = raw.trim();
            this.manualCustomerQuery = query;
            const nameField = this.forms.intake?.querySelector('[name="customer_name"]');
            if (query) {
                this.manualCustomerQuery = '';
                if (nameField) {
                    nameField.value = '';
                }
                if (this.inputs.newCustomerName) {
                    this.inputs.newCustomerName.value = '';
                }
            } else {
                if (nameField) {
                    nameField.value = this.manualCustomerQuery || '';
                }
                if (this.inputs.newCustomerName) {
                    this.inputs.newCustomerName.value = this.manualCustomerQuery || '';
                }
            }
            if (!query) {
                if (this.selects.existingCustomer) {
                    this.setSelectValue(this.selects.existingCustomer, '');
                    this.applyExistingCustomerSelection();
                }
                return;
            }
            const exactMatch = this.customerSearchIndex.get(raw);
            const normalizedMatch = this.customerNameMap.get(query.toLowerCase());
            const docname = exactMatch || normalizedMatch;
            if (docname) {
                this.manualCustomerQuery = '';
                if (this.selects.existingCustomer) {
                    const set = this.setSelectValue(this.selects.existingCustomer, docname);
                    if (!set) {
                        const customer = this.customerIndex.get(docname);
                        const label = customer ? customer.customer_name || customer.name : query;
                        this.ensureCustomerOptions(docname, label);
                        this.setSelectValue(this.selects.existingCustomer, docname);
                    }
                    this.applyExistingCustomerSelection();
                }
                return;
            }
            if (this.selects.existingCustomer) {
                this.setSelectValue(this.selects.existingCustomer, '');
            }
            this.lookupCustomerByName(query);
        }

        lookupCustomerByName(query) {
            if (!query) {
                return;
            }
            if (!window.frappe || !frappe.call) {
                this.notifyCustomerNotFound();
                return;
            }
            frappe.call({
                method: 'garage.api.portal.lookup_customer',
                args: { query },
                callback: (response) => {
                    const data = response?.message || {};
                    const customer = data.customer;
                    if (!customer) {
                        this.notifyCustomerNotFound();
                        return;
                    }
                    this.registerCustomerData(customer);
                    if (Array.isArray(data.vehicles)) {
                        data.vehicles.forEach((vehicle) => this.registerVehicleData(vehicle));
                        this.refreshBrandModelOptions();
                    }
                    if (this.selects.existingCustomer) {
                        const set = this.setSelectValue(this.selects.existingCustomer, customer.name);
                        if (!set) {
                            this.ensureCustomerOptions(customer.name, customer.customer_name || customer.name);
                            this.setSelectValue(this.selects.existingCustomer, customer.name);
                        }
                        this.applyExistingCustomerSelection();
                    } else {
                        this.updateCustomerSearchInput(customer);
                    }
                    if (window.frappe && frappe.show_alert) {
                        frappe.show_alert({
                            message: __('Data customer ditemukan dan terisi otomatis.'),
                            indicator: 'green',
                        });
                    }
                },
                error: () => {
                    this.notifyCustomerNotFound();
                },
            });
        }

        notifyCustomerNotFound() {
            if (window.frappe && frappe.show_alert) {
                frappe.show_alert({
                    message: __('Customer tidak ditemukan. Periksa kembali nama yang dimasukkan.'),
                    indicator: 'yellow',
                });
            }
        }

        setupBrandModelControls() {
            const brandSelect = this.selects.brand;
            const modelSelect = this.selects.model;
            const variantSelect = this.selects.modelVariant;
            
            if (!brandSelect || !modelSelect) {
                return;
            }
            
            const currentBrand = brandSelect.value || '';
            const currentModel = modelSelect.value || '';
            const currentVariant = variantSelect?.value || '';
            
            this.populateBrandOptions(currentBrand);
            this.populateModelOptions(currentBrand, currentModel, currentVariant);
            
            if (this.brandModelInitialized) {
                return;
            }
            
            // ✅ PERBAIKAN: Tambahkan check isPrefilling
            brandSelect.addEventListener('change', () => {
                // Skip jika sedang dalam proses prefilling
                if (this.isPrefilling) {
                    return;
                }
                
                const selectedBrand = brandSelect.value || '';
                if (variantSelect) {
                    variantSelect.value = '';
                    variantSelect.removeAttribute('data-pending-value');
                }
                this.populateModelOptions(selectedBrand, '', '');
                this.scheduleBootstrapRefresh();
            });
            
            // ✅ PERBAIKAN: Tambahkan check isPrefilling dan call updateTypeModelField
            modelSelect.addEventListener('change', () => {
                // Skip jika sedang dalam proses prefilling
                if (this.isPrefilling) {
                    return;
                }
                
                const selectedBrand = brandSelect.value || '';
                const selectedModel = modelSelect.value || '';
                this.populateVariantOptions(selectedBrand, selectedModel);
                
                // Update field type_model
                this.updateTypeModelField(selectedBrand, selectedModel);
                
                this.scheduleBootstrapRefresh();
            });
            
            // ✅ PERBAIKAN: Update variant listener
            if (variantSelect) {
                variantSelect.addEventListener('change', () => {
                    if (this.isPrefilling) {
                        return;
                    }
                    
                    const selectedBrand = brandSelect.value || '';
                    const selectedModel = modelSelect.value || '';
                    this.updateTypeModelField(selectedBrand, selectedModel);
                    
                    this.scheduleBootstrapRefresh();
                });
            }
            
            this.brandModelInitialized = true;
        }

        updateTypeModelField(brand, model) {
            const form = this.forms.intake;
            if (!form) {
                return;
            }
            
            const typeModelField = form.querySelector('[name="type_model"]');
            if (!typeModelField) {
                return;
            }
            
            if (brand && model) {
                const typeModelValue = `${brand} ${model}`;
                
                if (typeModelField.tagName === 'SELECT') {
                    this.addOptionIfMissing(typeModelField, typeModelValue, typeModelValue);
                    typeModelField.value = typeModelValue;
                } else {
                    typeModelField.value = typeModelValue;
                }
            } else {
                typeModelField.value = '';
            }
        }

        populateBrandOptions(selectedBrand = '') {
            const brandSelect = this.selects.brand;
            if (!brandSelect) {
                return;
            }
            let previousSelection = selectedBrand || brandSelect.value || '';
            const pendingValue = brandSelect.getAttribute('data-pending-value');
            if (!previousSelection && pendingValue) {
                previousSelection = pendingValue;
            }
            brandSelect.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '— Pilih Merek —';
            brandSelect.appendChild(placeholder);
            const brandMap = this.brandModelMap || {};
            const brands = Object.keys(brandMap).sort((a, b) => a.localeCompare(b));
            brands.forEach((brand) => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand;
                brandSelect.appendChild(option);
            });
            if (previousSelection && !brands.includes(previousSelection)) {
                const option = document.createElement('option');
                option.value = previousSelection;
                option.textContent = previousSelection;
                brandSelect.appendChild(option);
            }
            brandSelect.value = previousSelection && Array.from(brandSelect.options).some((option) => option.value === previousSelection)
                ? previousSelection
                : '';
            brandSelect.removeAttribute('data-pending-value');
        }

        populateModelOptions(brand, selectedModel = '', selectedVariant = undefined) {
            const modelSelect = this.selects.model;
            if (!modelSelect) {
                return;
            }
            
            const normalizedBrand = brand || '';
            const models = this.getModelsForBrand(normalizedBrand);
            
            let previousSelection = selectedModel || modelSelect.value || '';
            const pendingValue = modelSelect.getAttribute('data-pending-value');
            if (!previousSelection && pendingValue) {
                previousSelection = pendingValue;
            }
            
            // Clear and rebuild options
            modelSelect.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '— Pilih Model —';
            modelSelect.appendChild(placeholder);
            
            models.forEach((model) => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.name;
                modelSelect.appendChild(option);
            });
            
            // Add custom model if not in list
            if (previousSelection) {
                const hasModel = models.some((model) => model.name === previousSelection);
                if (!hasModel) {
                    const option = document.createElement('option');
                    option.value = previousSelection;
                    option.textContent = previousSelection;
                    modelSelect.appendChild(option);
                }
                modelSelect.value = previousSelection;
            } else {
                modelSelect.value = '';
            }
            
            modelSelect.disabled = !models.length && !previousSelection;
            modelSelect.removeAttribute('data-pending-value');
            
            // ✅ PERBAIKAN 1: Populate variant options setelah set model
            const variantSelect = this.selects.modelVariant;
            if (variantSelect) {
                const effectiveModel = modelSelect.value || previousSelection || '';
                this.populateVariantOptions(normalizedBrand, effectiveModel, selectedVariant);
            }
            
            // ✅ PERBAIKAN 2: Update type_model field (skip saat prefilling)
            if (!this.isPrefilling && normalizedBrand && modelSelect.value) {
                this.updateTypeModelField(normalizedBrand, modelSelect.value);
            }
        }

        getModelsForBrand(brand) {
            const entries = this.brandModelMap?.[brand];
            if (!Array.isArray(entries)) {
                return [];
            }
            return entries
                .map((entry) => {
                    if (typeof entry === 'string') {
                        return { name: entry, variants: undefined };
                    }
                    if (entry && typeof entry === 'object') {
                        const name = entry.name || '';
                        if (!name) {
                            return null;
                        }
                        const variants = Array.isArray(entry.variants) ? entry.variants.filter((variant) => !!variant) : undefined;
                        return { name, variants };
                    }
                    return null;
                })
                .filter((entry) => entry && entry.name);
        }

        getModelEntry(brand, model) {
            if (!model) {
                return null;
            }
            const models = this.getModelsForBrand(brand);
            return models.find((entry) => entry.name === model) || null;
        }

        generateModelVariants(model) {
            const base = (model || '').trim();
            if (!base) {
                return [];
            }
            if (/lainnya/i.test(base)) {
                return ['Manual', 'Automatic', 'CVT', 'Varian Lainnya'];
            }
            return [
                `${base} Manual`,
                `${base} Automatic`,
                `${base} CVT`,
                `${base} Varian Lainnya`,
            ];
        }

        populateVariantOptions(brand, model, selectedVariant = undefined) {
            const variantSelect = this.selects.modelVariant;
            if (!variantSelect) {
                return;
            }
            let previousSelection = selectedVariant !== undefined ? selectedVariant : variantSelect.value || '';
            const pendingValue = variantSelect.getAttribute('data-pending-value');
            if (!previousSelection && pendingValue) {
                previousSelection = pendingValue;
            }
            variantSelect.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '— Pilih Tipe Model —';
            variantSelect.appendChild(placeholder);
            let variants = [];
            if (model) {
                const entry = this.getModelEntry(brand, model);
                if (entry && Array.isArray(entry.variants) && entry.variants.length) {
                    variants = entry.variants;
                } else {
                    variants = this.generateModelVariants(model);
                }
            }
            variants.forEach((variant) => {
                const option = document.createElement('option');
                option.value = variant;
                option.textContent = variant;
                variantSelect.appendChild(option);
            });
            if (previousSelection) {
                const hasVariant = variants.includes(previousSelection);
                if (!hasVariant) {
                    const option = document.createElement('option');
                    option.value = previousSelection;
                    option.textContent = previousSelection;
                    variantSelect.appendChild(option);
                }
                variantSelect.value = previousSelection;
            } else {
                variantSelect.value = '';
            }
            variantSelect.disabled = !variants.length && !previousSelection;
            variantSelect.removeAttribute('data-pending-value');
        }

        normalizeLicensePlate(value) {
            return (value || '')
                .toString()
                .trim()
                .replace(/[^0-9A-Za-z]/g, '')
                .toUpperCase();
        }


        initRepeaters() {
            Object.values(this.forms).forEach((form) => {
                if (!form) {
                    return;
                }
                form.querySelectorAll('[data-repeat]').forEach((group) => {
                    const addButton = group.querySelector('[data-action="add-row"]');
                    const rowsContainer = group.querySelector('[data-role="rows"]');
                    const template = group.querySelector('template[data-role="row-template"]');
                    if (!rowsContainer || !template) {
                        return;
                    }
                    if (addButton) {
                        addButton.addEventListener('click', () => {
                            const fragment = template.content.cloneNode(true);
                            rowsContainer.appendChild(fragment);
                        });
                    }
                    rowsContainer.addEventListener('click', (event) => {
                        const target = event.target;
                        if (target && target.matches('[data-action="remove-row"]')) {
                            const row = target.closest('.repeat-row');
                            if (row) {
                                row.remove();
                            }
                        }
                    });
                });
            });
        }

        fetchBootstrap(showNotification = true, freezeRequest = true) {
            const activeBranch =
                (this.state && typeof this.state.active_branch === 'string'
                    ? this.state.active_branch.trim()
                    : '')
                    || this.preferredBranch
                    || (this.selects.globalBranch ? this.selects.globalBranch.value : '');
            frappe.call({
                method: 'garage.api.portal.portal_bootstrap',
                args: activeBranch ? { branch: activeBranch } : {},
                freeze: freezeRequest,
                callback: (response) => {
                    if (response?.exc || response?.exception) {
                        this.handleBootstrapFailure(response);
                        return;
                    }

                    const payload = response?.message;
                    const message = (payload && typeof payload === 'object' && !Array.isArray(payload)
                        ? payload.message || payload
                        : {});

                    this.state = message && typeof message === 'object' && !Array.isArray(message) ? message : {};

                    try {
                        window.garagePortalState = this.state;
                        document.dispatchEvent(
                            new CustomEvent('garage-portal:state-updated', {
                                detail: { state: this.state },
                            })
                        );
                    } catch (error) {
                        console.error('Garage portal: failed to broadcast state update', error);
                    }

                    this.render();
                    if (showNotification) {
                        frappe.show_alert({ message: __('Data portal diperbarui.'), indicator: 'green' });
                    }
                },
                error: (error) => {
                    this.handleBootstrapFailure(error);
                },
            });
        }

        render() {
            this.updateBranchSelects();
            this.updateDeskLinks();
            this.renderIntakeSection();
            this.renderServiceSection();
            this.renderSpareOrders();
            this.renderProcurement();
            this.renderFinance();
            this.renderStatusSummary();
            this.renderRefreshedAt();
        }

        renderIntakeSection() {
            const customers = this.asArray(this.state.customers);
            const vehicles = this.asArray(this.state.vehicles);

            this.customerIndex = new Map(customers.map((customer) => [customer.name, customer]));
            this.rebuildCustomerSearch(customers);
            this.vehicleIndex = new Map();
            this.vehicleOptionIndex = new Map();
            if (this.datalists?.licensePlates) {
                this.datalists.licensePlates.innerHTML = '';
            }
            vehicles.forEach((vehicle) => {
                this.registerVehicleData(vehicle);
            });

            this.refreshBrandModelOptions();

            this.populateSelect(this.selects.existingCustomer, customers, {
                valueKey: 'name',
                labelKey: 'customer_name',
                blankLabel: '— Customer Baru —',
            });

            this.populateSelect(this.selects.serviceCustomer, customers, {
                valueKey: 'name',
                labelKey: 'customer_name',
                blankLabel: '— Pilih customer —',
            });
            this.populateSelect(this.selects.spareCustomer, customers, {
                valueKey: 'name',
                labelKey: 'customer_name',
                blankLabel: '— Pilih customer —',
            });
            this.populateSelect(this.selects.invoiceCustomer, customers, {
                valueKey: 'name',
                labelKey: 'customer_name',
                blankLabel: '— Pilih customer —',
            });
            this.populateSelect(this.selects.paymentCustomer, customers, {
                valueKey: 'name',
                labelKey: 'customer_name',
                blankLabel: '— Pilih customer —',
            });

            if (this.selects.existingCustomer) {
                const selected = this.selects.existingCustomer.value;
                if (selected) {
                    const selectedCustomer = this.customerIndex.get(selected);
                    this.updateCustomerSearchInput(selectedCustomer || null);
                } else {
                    this.updateCustomerSearchInput(null);
                }
            } else {
                this.updateCustomerSearchInput(null);
            }

            this.updateServiceVehicleOptions();

            const customerMap = this.customerIndex;
            const combinedRows = vehicles.slice(0, 8).map((vehicle) => {
                const customer = customerMap.get(vehicle.customer);
                const contact = customer ? [customer.phone, customer.email].filter(Boolean).join(' / ') : '';
                const model = vehicle.model || '-';
                const brand = vehicle.brand || '-';
                const typeModel = vehicle.type_model || '-';
                const chassis = vehicle.vin || '-';
                const engine = vehicle.engine_number || '-';
                const serviceTimestamp = vehicle.last_service_logged_at || vehicle.last_service_date || vehicle.creation;
                return [
                    this.renderLink(
                        'Garage Customer',
                        customer?.name || vehicle.customer,
                        customer?.customer_name || vehicle.customer || '-'
                    ),
                    customer?.customer_type || '-',
                    contact || '-',
                    customer?.is_vip ? 'Ya' : 'Tidak',
                    this.renderLink('Garage Vehicle', vehicle.name, vehicle.license_plate || vehicle.name),
                    brand,
                    typeModel,
                    model,
                    chassis,
                    engine,
                    this.formatTimestamp(serviceTimestamp),
                ];
            });

            if (!combinedRows.length) {
                customers.slice(0, 8).forEach((customer) => {
                    const contact = [customer.phone, customer.email].filter(Boolean).join(' / ');
                    combinedRows.push([
                        this.renderLink('Garage Customer', customer.name, customer.customer_name || customer.name),
                        customer.customer_type || '-',
                        contact || '-',
                        customer.is_vip ? 'Ya' : 'Tidak',
                        '—',
                        '—',
                        '—',
                        '—',
                        '—',
                        '—',
                        '—',
                    ]);
                });
            }

            this.renderTable(
                this.tables.customerVehicles,
                combinedRows,
                (row) => row,
                this.emptyStates.customerVehicles
            );
        }

        renderServiceSection() {
            const serviceOrders = this.asArray(this.state.service_orders);
            const openService = this.asArray(this.state.open_service_orders);
            this.cachedServiceOrders = serviceOrders;

            const totalEstimate = serviceOrders.reduce((acc, row) => acc + (parseFloat(row.total_estimated_amount) || 0), 0);
            const qcPending = serviceOrders.filter((row) => (row.qc_status || '').toLowerCase() === 'pending').length;

            this.updateMetric(this.metrics.serviceEstimate, totalEstimate);
            if (this.metrics.serviceOpenCount) {
                this.metrics.serviceOpenCount.textContent = openService.length.toString();
            }
            if (this.metrics.qcPending) {
                this.metrics.qcPending.textContent = qcPending.toString();
            }

            this.renderTable(
                this.tables.openService,
                openService,
                (row) => {
                    const noteCell = document.createElement('div');
                    noteCell.className = 'table-note';
                    if (row.service_notes) {
                        noteCell.textContent = row.service_notes;
                        noteCell.title = row.service_notes;
                    } else {
                        noteCell.textContent = '-';
                    }
                    return [
                        this.renderLink('Garage Service Order', row.name),
                        row.customer || '-',
                        noteCell,
                        row.status || '-',
                        row.estimated_delivery_date || '-',
                    ];
                },
                this.emptyStates.openService,
            );

            const progressOptions = serviceOrders.map((row) => ({ value: row.name, label: `${row.name} – ${row.customer || '-'}` }));
            this.populateSelect(this.selects.progressServiceOrder, progressOptions, {
                blankLabel: '— Pilih service order —',
            });
        }

        updateSpareMetrics() {
            const totalParts = this.sparePartCatalog ? this.sparePartCatalog.length : 0;
            const requestRows = this.asArray(this.state.spare_part_requests);
            const requestTotal = new Set(
                requestRows.map((row) => row.parent || row.name).filter(Boolean)
            ).size;
            const lowStockTotal = (this.sparePartCatalog || []).filter((part) => this.isLowStock(part)).length;

            if (this.metrics.spareCount) {
                this.metrics.spareCount.textContent = totalParts.toString();
            }
            if (this.metrics.spareRequestCount) {
                this.metrics.spareRequestCount.textContent = requestTotal.toString();
            }
            if (this.metrics.spareLowStock) {
                this.metrics.spareLowStock.textContent = lowStockTotal.toString();
            }
        }

        renderSpareOrders() {
            const spareOrders = this.asArray(this.state.spare_orders);
            if (this.tables.spareOrders) {
                this.renderTable(this.tables.spareOrders, spareOrders, (row) => [
                    this.renderLink('Garage Spare Part Order', row.name),
                    row.customer || '-',
                    row.status || '-',
                    row.delivery_date || '-',
                ], this.emptyStates.spare);
            }

            this.sparePartCatalog = this.asArray(this.state.spare_parts);
            this.sparePartIndex = new Map();
            this.sparePartCatalog.forEach((part) => {
                if (part?.name) {
                    this.sparePartIndex.set(part.name, part);
                }
                if (part?.part_code) {
                    this.sparePartIndex.set(part.part_code, part);
                }
            });

            const serviceOrders = this.asArray(this.state.service_orders);
            this.renderSpareRequestsTable(serviceOrders);

            this.updateSpareMetrics();

            const searchValue = this.inputs.spareSearch ? this.inputs.spareSearch.value || '' : '';
            this.applySpareSearch(searchValue, false);
        }

        renderSpareRequestsTable(serviceOrders) {
            const table = this.tables.spareRequests;
            if (!table) {
                return;
            }

            const requests = this.asArray(this.state.spare_part_requests);
            this.spareRequestGroups = new Map();
            table.innerHTML = '';
            if (!requests.length) {
                if (this.emptyStates.spareRequests) {
                    this.emptyStates.spareRequests.style.display = 'block';
                }
                return;
            }
            if (this.emptyStates.spareRequests) {
                this.emptyStates.spareRequests.style.display = 'none';
            }

            const serviceIndex = new Map(serviceOrders.map((order) => [order.name, order]));
            const groupedRequests = [];
            const groupIndex = new Map();

            requests.forEach((request) => {
                const key = request.parent || request.name || `orphan-${request.item_code || request.item_name || ''}`;
                if (!groupIndex.has(key)) {
                    const order = serviceIndex.get(request.parent) || {};
                    const group = { key, order, requests: [] };
                    groupIndex.set(key, group);
                    groupedRequests.push(group);
                }
                groupIndex.get(key).requests.push(request);
            });

            groupedRequests.forEach((group) => {
                const order = group.order || {};
                const detailItems = group.requests.map((request) => {
                    const part =
                        this.lookupSparePart(request.item_code) ||
                        this.lookupSparePart(request.item_name) ||
                        {};
                    const qty = parseFloat(request.qty) || 0;
                    const availableNumeric = parseFloat(part.stock_qty);
                    return {
                        request,
                        part,
                        qty,
                        availableNumeric,
                    };
                });

                this.spareRequestGroups.set(group.key, {
                    order,
                    requests: [...group.requests],
                    items: detailItems,
                });

                const tr = document.createElement('tr');
                tr.className = 'spare-request-row';
                tr.setAttribute('data-request-group', group.key);

                const orderCell = document.createElement('td');
                orderCell.className = 'spare-request-cell spare-request-cell--order';
                const orderName = group.requests[0]?.parent;
                const primaryOrderName = orderName || group.requests[0]?.name || group.key;
                if (orderName) {
                    orderCell.appendChild(
                        this.renderLink('Garage Service Order', orderName, primaryOrderName || '-')
                    );
                } else {
                    const label = document.createElement('span');
                    label.textContent = primaryOrderName || '-';
                    orderCell.appendChild(label);
                }
                const orderMeta = document.createElement('div');
                orderMeta.className = 'table-meta';
                const orderMetaParts = [];
                if (order.customer) {
                    orderMetaParts.push(order.customer);
                }
                if (order.vehicle) {
                    orderMetaParts.push(order.vehicle);
                }
                orderMeta.textContent = orderMetaParts.join(' • ') || '-';
                orderCell.appendChild(orderMeta);
                tr.appendChild(orderCell);

                const partCell = document.createElement('td');
                partCell.className = 'spare-request-cell spare-request-cell--part';
                const nameEl = document.createElement('div');
                nameEl.className = 'spare-part-name';
                const partNames = detailItems.map((item) =>
                    item.request.item_name || item.part.part_name || item.request.item_code || '-'
                );
                const displayedNames = partNames.slice(0, 2).join(', ');
                nameEl.textContent = displayedNames || __('Tidak ada sparepart');
                partCell.appendChild(nameEl);

                const codeMeta = document.createElement('div');
                codeMeta.className = 'table-meta';
                if (detailItems.length === 1) {
                    const item = detailItems[0];
                    codeMeta.textContent = item.request.item_code || item.part.part_code || __('Manual');
                } else {
                    codeMeta.textContent = __('Total {0} sparepart', [detailItems.length]);
                }
                partCell.appendChild(codeMeta);

                if (detailItems.length > 2) {
                    const moreMeta = document.createElement('div');
                    moreMeta.className = 'table-meta';
                    moreMeta.textContent = __('Termasuk {0} item lain', [detailItems.length - 2]);
                    partCell.appendChild(moreMeta);
                }

                const categories = Array.from(
                    new Set(
                        detailItems
                            .map((item) => item.part.category)
                            .filter(Boolean)
                    )
                );
                if (categories.length) {
                    const categoryMeta = document.createElement('div');
                    categoryMeta.className = 'table-meta';
                    categoryMeta.textContent = categories.join(', ');
                    partCell.appendChild(categoryMeta);
                }

                const notes = detailItems
                    .map((item) => item.request.description)
                    .filter(Boolean);
                if (notes.length) {
                    const desc = document.createElement('div');
                    desc.className = 'table-note';
                    desc.textContent = notes[0];
                    if (notes.length > 1) {
                        desc.textContent += ` (+${notes.length - 1} ${__('catatan lainnya')})`;
                    }
                    partCell.appendChild(desc);
                }
                tr.appendChild(partCell);

                const qtyCell = document.createElement('td');
                qtyCell.className = 'spare-request-cell spare-request-cell--qty';
                const qtyValue = document.createElement('div');
                qtyValue.className = 'metric-text';
                qtyValue.textContent = `${detailItems.length} ${__('item')}`;
                qtyCell.appendChild(qtyValue);
                const readyCount = detailItems.filter(
                    (item) => Number.isFinite(item.availableNumeric) && item.availableNumeric >= item.qty
                ).length;
                const stockMeta = document.createElement('div');
                stockMeta.className = 'table-meta';
                stockMeta.textContent = __('{0} item siap dari {1}', [readyCount, detailItems.length]);
                qtyCell.appendChild(stockMeta);
                tr.appendChild(qtyCell);

                const statusCell = document.createElement('td');
                statusCell.className = 'spare-request-cell spare-request-cell--status';
                const statusCounts = {};
                detailItems.forEach((item) => {
                    const status = item.request.stock_status || item.part.status || __('Menunggu');
                    statusCounts[status] = (statusCounts[status] || 0) + 1;
                });
                const uniqueStatuses = Object.keys(statusCounts);
                const badgeLabel = uniqueStatuses.length === 1 ? uniqueStatuses[0] : __('Campuran');
                statusCell.appendChild(this.createStatusBadge(badgeLabel));
                const statusMeta = document.createElement('div');
                statusMeta.className = 'table-meta';
                const statusParts = [];
                statusParts.push(`${detailItems.length} ${__('permintaan')}`);
                if (uniqueStatuses.length) {
                    statusParts.push(
                        uniqueStatuses
                            .map((label) => `${label}: ${statusCounts[label]}`)
                            .join(' • ')
                    );
                }
                if (order.priority) {
                    statusParts.push(`${__('Prioritas')}: ${order.priority}`);
                }
                const lowStockCount = detailItems.filter((item) => this.isLowStock(item.part)).length;
                const outOfStockCount = detailItems.filter((item) => this.isOutOfStock(item.part)).length;
                if (outOfStockCount) {
                    statusParts.push(__('Stok habis pada {0} item', [outOfStockCount]));
                } else if (lowStockCount) {
                    statusParts.push(__('Stok menipis pada {0} item', [lowStockCount]));
                }
                statusMeta.textContent = statusParts.filter(Boolean).join(' • ') || __('-');
                statusCell.appendChild(statusMeta);
                tr.appendChild(statusCell);

                const managerCell = document.createElement('td');
                managerCell.className = 'spare-request-cell spare-request-cell--manager';
                const technicianNames = new Set();
                const technicianDetails = new Set();
                detailItems.forEach((item) => {
                    const technicianRows = this.asArray(item.request.technicians);
                    technicianRows.forEach((row) => {
                        if (!row) {
                            return;
                        }
                        const name = row.technician_name || row.technician;
                        if (name) {
                            technicianNames.add(name);
                        }
                        const details = [];
                        if (row.task) {
                            details.push(row.task);
                        }
                        if (row.status) {
                            details.push(row.status);
                        }
                        if (details.length) {
                            technicianDetails.add(details.join(' • '));
                        }
                    });
                });

                if (technicianNames.size) {
                    const primary = document.createElement('div');
                    primary.className = 'metric-text';
                    primary.textContent = Array.from(technicianNames).join(', ');
                    managerCell.appendChild(primary);
                    if (technicianDetails.size) {
                        const detailMeta = document.createElement('div');
                        detailMeta.className = 'table-meta';
                        detailMeta.textContent = Array.from(technicianDetails).join(' • ');
                        managerCell.appendChild(detailMeta);
                    }
                } else if (order.service_advisor) {
                    managerCell.textContent = order.service_advisor;
                } else {
                    managerCell.textContent = __('Belum ditetapkan');
                }
                tr.appendChild(managerCell);

                const actionsCell = document.createElement('td');
                actionsCell.className = 'spare-request-cell spare-request-cell--actions';
                const actionsWrapper = document.createElement('div');
                actionsWrapper.className = 'request-actions';

                const approveDisabled = detailItems.some(
                    (item) => !Number.isFinite(item.availableNumeric) || item.availableNumeric < item.qty
                );
                const actionConfigs = [
                    {
                        action: 'approve',
                        label: __('Approve Semua'),
                        className: 'primary small',
                        disabled: approveDisabled,
                        disabledTitle: __('Sparepart belum tersedia atau stok tidak mencukupi'),
                    },
                    { action: 'reject', label: __('Reject Semua'), className: 'danger small' },
                    { action: 'document', label: __('Dokumen'), className: 'ghost small' },
                    { action: 'cancel', label: __('Cancel Semua'), className: 'ghost small' },
                ];

                actionConfigs.forEach((config) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = config.className;
                    button.textContent = config.label;
                    button.dataset.requestAction = config.action;
                    if (config.disabled) {
                        button.disabled = true;
                        if (config.disabledTitle) {
                            button.title = config.disabledTitle;
                        }
                    }
                    button.addEventListener('click', () =>
                        this.handleSpareRequestAction(group.requests, config.action, button)
                    );
                    actionsWrapper.appendChild(button);
                });

                const detailButton = document.createElement('button');
                detailButton.type = 'button';
                detailButton.className = 'ghost small';
                detailButton.textContent = __('Detail');
                detailButton.dataset.requestAction = 'detail';
                detailButton.addEventListener('click', () => this.openSpareRequestDetail(group.key));
                actionsWrapper.appendChild(detailButton);

                actionsCell.appendChild(actionsWrapper);
                tr.appendChild(actionsCell);

                table.appendChild(tr);
            });
        }

        handleSpareRequestAction(requestOrGroup, action, button) {
            const requests = Array.isArray(requestOrGroup)
                ? requestOrGroup.filter((item) => item?.name)
                : requestOrGroup?.name
                    ? [requestOrGroup]
                    : [];

            if (!requests.length) {
                frappe.show_alert({ message: __('Permintaan tidak valid.'), indicator: 'orange' }, 5);
                return;
            }

            if (action === 'detail') {
                const first = requests[0];
                this.openSpareRequestDetail(first?.parent || first?.name);
                return;
            }

            if (action === 'document') {
                this.generateSpareRequestDocument(requests[0], button);
                return;
            }

            const confirmMessages = {
                approve:
                    requests.length > 1
                        ? __('Setujui {0} permintaan ini? Stok gudang akan berkurang otomatis.', [requests.length])
                        : __('Setujui permintaan ini? Stok gudang akan berkurang otomatis.'),
                reject:
                    requests.length > 1
                        ? __('Tolak {0} permintaan sparepart ini?', [requests.length])
                        : __('Tolak permintaan sparepart ini?'),
                cancel:
                    requests.length > 1
                        ? __('Batalkan {0} permintaan sparepart ini?', [requests.length])
                        : __('Batalkan permintaan sparepart ini?'),
                default: __('Lanjutkan aksi ini?'),
            };

            const executeAction = async () => {
                try {
                    if (button) {
                        button.disabled = true;
                    }
                    const indicatorMap = { approve: 'green', reject: 'red', cancel: 'orange' };
                    let lastPayload = null;
                    for (const request of requests) {
                        const response = await frappe.call({
                            method: 'garage.api.portal.update_spare_part_request_status',
                            args: { name: request.name, action },
                            freeze: true,
                            freeze_message: __('Memproses permintaan...'),
                        });
                        lastPayload = response?.message || lastPayload;
                    }
                    frappe.show_alert(
                        {
                            message:
                                lastPayload?.message ||
                                (requests.length > 1
                                    ? __('{0} permintaan diperbarui.', [requests.length])
                                    : __('Permintaan diperbarui.')),
                            indicator: indicatorMap[action] || 'green',
                        },
                        5,
                    );
                    this.fetchBootstrap(false);
                } catch (error) {
                    frappe.show_alert({ message: __('Gagal memproses: {0}', [error.message || error]), indicator: 'red' }, 5);
                } finally {
                    if (button) {
                        button.disabled = false;
                        button.blur();
                    }
                }
            };

            const confirmation = confirmMessages[action] || confirmMessages.default;
            if (frappe.confirm) {
                frappe.confirm(confirmation, () => executeAction());
            } else if (window.confirm(confirmation)) {
                executeAction();
            }
        }

        async generateSpareRequestDocument(requestOrGroup, button) {
            const request = Array.isArray(requestOrGroup) ? requestOrGroup[0] : requestOrGroup;
            const serviceOrder = request?.parent;
            if (!serviceOrder) {
                frappe.show_alert({ message: __('Order servis tidak ditemukan untuk permintaan ini.'), indicator: 'orange' }, 5);
                return;
            }

            try {
                if (button) {
                    button.disabled = true;
                }

                const response = await frappe.call({
                    method: 'garage.api.portal.generate_spare_part_approval_document',
                    args: { service_order: serviceOrder, request_name: request?.name },
                    freeze: true,
                    freeze_message: __('Menyiapkan dokumen persetujuan...'),
                });

                const payload = response?.message || {};
                const url = payload.print_url || payload.print_format_url;
                if (url) {
                    window.open(url, '_blank');
                }

                const message = payload.message || __('Dokumen persetujuan siap diunduh.');
                frappe.show_alert({ message, indicator: payload.indicator || 'green' }, 5);
            } catch (error) {
                frappe.show_alert(
                    { message: __('Gagal menyiapkan dokumen: {0}', [error.message || error]), indicator: 'red' },
                    7,
                );
            } finally {
                if (button) {
                    button.disabled = false;
                    button.blur();
                }
            }
        }

        openSpareRequestDetail(groupKey) {
            const modal = this.spareRequestModal;
            if (!modal?.container) {
                return;
            }

            const group = this.spareRequestGroups?.get(groupKey);
            if (!group) {
                frappe.show_alert({ message: __('Detail sparepart tidak ditemukan.'), indicator: 'orange' }, 5);
                return;
            }

            const orderName = group.requests[0]?.parent || group.requests[0]?.name || groupKey;
            if (modal.title) {
                modal.title.textContent = `${__('Detail Sparepart')} – ${orderName || '-'}`;
            }

            if (modal.summary) {
                const summaryParts = [];
                if (group.order?.customer) {
                    summaryParts.push(`${__('Customer')}: ${group.order.customer}`);
                }
                if (group.order?.vehicle) {
                    summaryParts.push(`${__('Kendaraan')}: ${group.order.vehicle}`);
                }
                if (group.order?.priority) {
                    summaryParts.push(`${__('Prioritas')}: ${group.order.priority}`);
                }
                summaryParts.push(`${group.requests.length} ${__('permintaan sparepart')}`);
                modal.summary.textContent = summaryParts.filter(Boolean).join(' • ');
            }

            if (modal.list) {
                modal.list.innerHTML = '';
                group.items.forEach((item) => {
                    const row = document.createElement('div');
                    row.className = 'spare-request-modal__item';

                    const header = document.createElement('div');
                    header.className = 'spare-request-modal__item-header';

                    const name = document.createElement('div');
                    name.className = 'spare-request-modal__item-name';
                    name.textContent = item.request.item_name || item.part.part_name || item.request.item_code || '-';
                    header.appendChild(name);

                    const code = document.createElement('div');
                    code.className = 'spare-request-modal__item-code';
                    code.textContent = item.request.item_code || item.part.part_code || __('Manual');
                    header.appendChild(code);

                    row.appendChild(header);

                    const qtyMeta = document.createElement('div');
                    qtyMeta.className = 'spare-request-modal__item-meta';
                    const qtyLabel = this.formatQuantityDisplay(
                        item.request.qty,
                        item.request.uom || item.part.uom || ''
                    );
                    const qtyParts = [`${__('Kuantitas')}: ${qtyLabel || '-'}`];
                    if (item.request.source) {
                        qtyParts.push(`${__('Sumber')}: ${item.request.source}`);
                    }
                    qtyMeta.textContent = qtyParts.join(' • ');
                    row.appendChild(qtyMeta);

                    const stockMeta = document.createElement('div');
                    stockMeta.className = 'spare-request-modal__item-meta';
                    const stockParts = [];
                    const available = this.formatStockValue(item.part.stock_qty);
                    if (available) {
                        stockParts.push(`${__('Stok')}: ${available}`);
                    }
                    if (item.request.warehouse || item.part.warehouse_location) {
                        stockParts.push(
                            `${__('Gudang')}: ${item.request.warehouse || item.part.warehouse_location}`
                        );
                    }
                    if (stockParts.length) {
                        stockMeta.textContent = stockParts.join(' • ');
                        row.appendChild(stockMeta);
                    }

                    const statusWrapper = document.createElement('div');
                    statusWrapper.className = 'spare-request-modal__item-status';
                    const statusLabel = item.request.stock_status || item.part.status || __('Menunggu');
                    statusWrapper.appendChild(this.createStatusBadge(statusLabel));
                    row.appendChild(statusWrapper);

                    const technicianRows = this.asArray(item.request.technicians);
                    const technicianNames = technicianRows
                        .map((tech) => (tech && (tech.technician_name || tech.technician)) || '')
                        .filter(Boolean);
                    if (technicianNames.length) {
                        const technicianMeta = document.createElement('div');
                        technicianMeta.className = 'spare-request-modal__item-meta';
                        technicianMeta.textContent = `${__('Teknisi')}: ${technicianNames.join(', ')}`;
                        row.appendChild(technicianMeta);
                    }

                    if (item.request.description) {
                        const desc = document.createElement('div');
                        desc.className = 'spare-request-modal__item-note';
                        desc.textContent = item.request.description;
                        row.appendChild(desc);
                    }

                    if (!Number.isFinite(item.availableNumeric) || item.availableNumeric < item.qty) {
                        const warning = document.createElement('div');
                        warning.className = 'spare-request-modal__item-warning';
                        warning.textContent = __('Stok belum mencukupi untuk item ini.');
                        row.appendChild(warning);
                    }

                    modal.list.appendChild(row);
                });
            }

            const hasItems = group.items.length > 0;
            if (modal.emptyState) {
                modal.emptyState.classList.toggle('is-visible', !hasItems);
            }
            if (modal.list) {
                modal.list.style.display = hasItems ? 'flex' : 'none';
            }

            this.previousFocus = document.activeElement;
            modal.container.classList.add('is-open');
            modal.container.setAttribute('aria-hidden', 'false');
            this.bodyOverflowCache = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', this.boundSpareRequestModalKeydown);

            const closeButton = modal.container.querySelector('.portal-modal__close');
            if (closeButton) {
                closeButton.focus();
            }
        }

        closeSpareRequestDetail() {
            const modal = this.spareRequestModal;
            if (!modal?.container) {
                return;
            }
            modal.container.classList.remove('is-open');
            modal.container.setAttribute('aria-hidden', 'true');
            document.removeEventListener('keydown', this.boundSpareRequestModalKeydown);
            if (typeof this.bodyOverflowCache === 'string') {
                document.body.style.overflow = this.bodyOverflowCache;
            } else {
                document.body.style.removeProperty('overflow');
            }
            if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
                this.previousFocus.focus();
            }
        }

        handleSpareRequestModalKeydown(event) {
            if (event.key === 'Escape') {
                this.closeSpareRequestDetail();
            }
        }

        applySpareSearch(query = '', preserveSelection = true) {
            const normalized = (query || '').toString().toLowerCase().trim();
            if (!normalized) {
                this.filteredSpareParts = [...this.sparePartCatalog];
            } else {
                this.filteredSpareParts = this.sparePartCatalog.filter((part) => {
                    const haystack = [
                        part.part_code,
                        part.part_name,
                        part.category,
                        part.brand,
                        part.warehouse_location,
                        part.managed_by,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    return haystack.includes(normalized);
                });
            }

            this.renderSpareInventoryTable();

            const currentName = this.currentSparePart?.name;
            const stillVisible = currentName && this.filteredSpareParts.some((part) => part.name === currentName);

            if (!preserveSelection || !stillVisible) {
                const first = this.filteredSpareParts[0];
                if (first) {
                    this.selectSparePart(first.name, { focusForm: false, silent: true });
                } else {
                    this.currentSparePart = null;
                    this.renderSpareDetail(null);
                    this.highlightSelectedSpare(null);
                }
            } else {
                this.highlightSelectedSpare(currentName);
            }
        }

        renderSpareInventoryTable() {
            const table = this.tables.spareInventory;
            if (!table) {
                return;
            }

            table.innerHTML = '';
            const parts = this.filteredSpareParts || [];
            if (!parts.length) {
                if (this.emptyStates.spareInventory) {
                    this.emptyStates.spareInventory.style.display = 'block';
                }
                return;
            }
            if (this.emptyStates.spareInventory) {
                this.emptyStates.spareInventory.style.display = 'none';
            }

            parts.forEach((part) => {
                const tr = document.createElement('tr');
                tr.className = 'inventory-row';
                if (part?.name) {
                    tr.setAttribute('data-part-name', part.name);
                }
                const outOfStock = this.isOutOfStock(part);
                const lowStock = this.isLowStock(part);
                if (outOfStock) {
                    tr.classList.add('inventory-row--critical');
                } else if (lowStock) {
                    tr.classList.add('inventory-row--low');
                }

                const infoCell = document.createElement('td');
                infoCell.className = 'inventory-cell inventory-cell--info';
                const infoWrapper = document.createElement('div');
                infoWrapper.className = 'inventory-info';
                if (part.image) {
                    const thumb = document.createElement('div');
                    thumb.className = 'inventory-thumb';
                    thumb.style.backgroundImage = `url('${encodeURI(part.image)}')`;
                    infoWrapper.appendChild(thumb);
                } else {
                    const thumb = document.createElement('div');
                    thumb.className = 'inventory-thumb is-empty';
                    thumb.textContent = '🧩';
                    infoWrapper.appendChild(thumb);
                }
                const textWrapper = document.createElement('div');
                textWrapper.className = 'inventory-info__text';
                const title = document.createElement('div');
                title.className = 'inventory-name';
                title.textContent = part.part_name || part.part_code || '-';
                textWrapper.appendChild(title);
                const metaLine = document.createElement('div');
                metaLine.className = 'table-meta';
                const metaParts = [part.part_code, part.category].filter(Boolean);
                metaLine.textContent = metaParts.length ? metaParts.join(' • ') : __('Tidak ada kategori');
                textWrapper.appendChild(metaLine);
                if (part.brand) {
                    const brandMeta = document.createElement('div');
                    brandMeta.className = 'table-meta';
                    brandMeta.textContent = part.brand;
                    textWrapper.appendChild(brandMeta);
                }
                infoWrapper.appendChild(textWrapper);
                infoCell.appendChild(infoWrapper);
                tr.appendChild(infoCell);

                const stockCell = document.createElement('td');
                stockCell.className = 'inventory-cell inventory-cell--stock';
                const available = document.createElement('div');
                available.className = 'metric-text';
                available.textContent = this.formatStockValue(part.stock_qty) || '0';
                stockCell.appendChild(available);
                const reserved = document.createElement('div');
                reserved.className = 'table-meta';
                reserved.textContent = `${__('Reservasi')}: ${this.formatStockValue(part.reserved_qty) || '0'}`;
                stockCell.appendChild(reserved);
                if (part.reorder_level) {
                    const reorderMeta = document.createElement('div');
                    reorderMeta.className = 'table-meta';
                    reorderMeta.textContent = `${__('Batas Reorder')}: ${this.formatStockValue(part.reorder_level)}`;
                    stockCell.appendChild(reorderMeta);
                }
                if (outOfStock) {
                    const alert = document.createElement('div');
                    alert.className = 'stock-alert stock-alert--critical';
                    alert.textContent = `⚠️ ${__('Stok habis – perlu restock')}`;
                    stockCell.appendChild(alert);
                } else if (lowStock) {
                    const alert = document.createElement('div');
                    alert.className = 'stock-alert stock-alert--low';
                    alert.textContent = `⚠️ ${__('Stok menipis')}`;
                    stockCell.appendChild(alert);
                }
                tr.appendChild(stockCell);

                const priceCell = document.createElement('td');
                priceCell.className = 'inventory-cell inventory-cell--price';
                const priceValue = document.createElement('div');
                priceValue.className = 'metric-text';
                priceValue.textContent = this.currencyFormatter.format(parseFloat(part.unit_price) || 0);
                priceCell.appendChild(priceValue);
                const priceMeta = document.createElement('div');
                priceMeta.className = 'table-meta';
                priceMeta.textContent = part.last_restocked_on
                    ? this.formatTimestamp(part.last_restocked_on)
                    : __('Belum pernah restock');
                priceCell.appendChild(priceMeta);
                tr.appendChild(priceCell);

                const metaCell = document.createElement('td');
                metaCell.className = 'inventory-cell inventory-cell--meta';
                metaCell.appendChild(this.createStatusBadge(part.status || 'Active'));
                const metaInfo = document.createElement('div');
                metaInfo.className = 'table-meta';
                const metaText = [part.warehouse_location, part.managed_by]
                    .filter(Boolean)
                    .join(' • ');
                metaInfo.textContent = metaText || __('Tidak ada info gudang');
                metaCell.appendChild(metaInfo);
                tr.appendChild(metaCell);

                table.appendChild(tr);
            });

            this.highlightSelectedSpare(this.currentSparePart?.name);
        }

        renderSpareDetail(part) {
            const form = this.forms.sparePartDetail;
            if (!form) {
                return;
            }

            if (!part) {
                this.resetSpareDetailForm();
                return;
            }

            this.populateSpareDetailForm(part);

            if (this.spareDetail.title) {
                this.spareDetail.title.textContent = __('Detail Sparepart');
            }
            if (this.spareDetail.name) {
                this.spareDetail.name.textContent = part.part_name || part.part_code || '-';
            }
            if (this.spareDetail.meta) {
                this.spareDetail.meta.textContent = [
                    part.category,
                    part.brand,
                    part.warehouse_location,
                ]
                    .filter(Boolean)
                    .join(' • ');
            }
            if (this.spareDetail.status) {
                this.spareDetail.status.innerHTML = '';
                this.spareDetail.status.appendChild(this.createStatusBadge(part.status || 'Active'));
                if (this.isOutOfStock(part)) {
                    const alert = document.createElement('div');
                    alert.className = 'stock-alert stock-alert--critical';
                    alert.textContent = `⚠️ ${__('Stok habis – perlu restock')}`;
                    this.spareDetail.status.appendChild(alert);
                } else if (this.isLowStock(part)) {
                    const alert = document.createElement('div');
                    alert.className = 'stock-alert stock-alert--low';
                    alert.textContent = `⚠️ ${__('Stok menipis')}`;
                    this.spareDetail.status.appendChild(alert);
                }
            }
            if (this.spareDetail.image) {
                if (part.image) {
                    this.spareDetail.image.style.backgroundImage = `url('${encodeURI(part.image)}')`;
                    this.spareDetail.image.classList.remove('is-empty');
                } else {
                    this.spareDetail.image.style.backgroundImage = '';
                    this.spareDetail.image.classList.add('is-empty');
                }
            }
        }

        populateSpareDetailForm(part) {
            const form = this.forms.sparePartDetail;
            if (!form) {
                return;
            }
            const fields = [
                'name',
                'part_code',
                'part_name',
                'category',
                'brand',
                'uom',
                'unit_price',
                'stock_qty',
                'reserved_qty',
                'reorder_level',
                'warehouse_location',
                'managed_by',
                'status',
                'last_restocked_on',
                'image',
                'notes',
            ];
            fields.forEach((field) => {
                const input = form.querySelector(`[name="${field}"]`);
                if (!input) {
                    return;
                }
                const value = part[field];
                if (value === undefined || value === null) {
                    input.value = '';
                } else {
                    input.value = value;
                }
            });
        }

        resetSpareDetailForm() {
            const form = this.forms.sparePartDetail;
            if (!form) {
                return;
            }
            form.reset();
            const nameInput = form.querySelector('[name="name"]');
            if (nameInput) {
                nameInput.value = '';
            }
            const statusInput = form.querySelector('[name="status"]');
            if (statusInput) {
                statusInput.value = 'Active';
            }
            const uomInput = form.querySelector('[name="uom"]');
            if (uomInput) {
                uomInput.value = 'Unit';
            }
            if (this.spareDetail.title) {
                this.spareDetail.title.textContent = __('Tambah Sparepart');
            }
            if (this.spareDetail.name) {
                this.spareDetail.name.textContent = __('Sparepart baru');
            }
            if (this.spareDetail.meta) {
                this.spareDetail.meta.textContent = __('Lengkapi detail di formulir.');
            }
            if (this.spareDetail.status) {
                this.spareDetail.status.innerHTML = '';
            }
            if (this.spareDetail.image) {
                this.spareDetail.image.style.backgroundImage = '';
                this.spareDetail.image.classList.add('is-empty');
            }
        }

        highlightSelectedSpare(name) {
            if (!this.tables.spareInventory) {
                return;
            }
            this.tables.spareInventory.querySelectorAll('tr').forEach((row) => {
                if (name && row.getAttribute('data-part-name') === name) {
                    row.classList.add('is-selected');
                } else {
                    row.classList.remove('is-selected');
                }
            });
        }

        lookupSparePart(key) {
            if (!key) {
                return null;
            }
            return this.sparePartIndex.get(key) || null;
        }

        startCreateSparePart() {
            this.creatingSparePart = true;
            this.currentSparePart = null;
            this.highlightSelectedSpare(null);
            this.resetSpareDetailForm();
            if (this.inputs.spareSearch) {
                this.inputs.spareSearch.value = '';
            }
            this.filteredSpareParts = [...this.sparePartCatalog];
            this.renderSpareInventoryTable();
        }

        selectSparePart(name, options = {}) {
            if (!name) {
                return;
            }
            const part = this.lookupSparePart(name);
            if (!part) {
                return;
            }
            this.creatingSparePart = false;
            this.currentSparePart = part;
            this.renderSpareDetail(part);
            this.highlightSelectedSpare(part.name);
            if (options.focusForm !== false && this.forms.sparePartDetail) {
                const focusField = this.forms.sparePartDetail.querySelector('[name="stock_qty"]');
                if (focusField) {
                    focusField.focus();
                }
            }
        }

        async submitSparePartDetail() {
            const form = this.forms.sparePartDetail;
            if (!form) {
                return;
            }
            const nameInput = form.querySelector('[name="name"]');
            const existingName = nameInput?.value?.trim();
            const fields = [
                'part_code',
                'part_name',
                'category',
                'brand',
                'uom',
                'unit_price',
                'stock_qty',
                'reserved_qty',
                'reorder_level',
                'warehouse_location',
                'managed_by',
                'status',
                'last_restocked_on',
                'image',
                'notes',
            ];
            const payload = this.collectFormData(form, fields);
            if (!existingName && !payload.part_code) {
                frappe.show_alert({ message: __('Masukkan kode sparepart terlebih dahulu.'), indicator: 'orange' });
                const codeField = form.querySelector('[name="part_code"]');
                codeField?.focus();
                return;
            }

            const primaryButton = form.querySelector('button.primary');
            if (primaryButton) {
                primaryButton.disabled = true;
            }

            const method = existingName ? 'garage.api.portal.update_spare_part' : 'garage.api.portal.create_spare_part';
            const args = existingName ? { name: existingName, updates: payload } : { part: payload };

            try {
                const response = await frappe.call({ method, args, freeze: true });
                const message = response?.message || {};
                frappe.show_alert({
                    message: existingName ? __('Sparepart diperbarui.') : __('Sparepart baru ditambahkan.'),
                    indicator: 'green',
                });
                this.updateSparePartState(existingName, payload, message);
            } catch (error) {
                frappe.show_alert({ message: __('Gagal menyimpan sparepart.'), indicator: 'red' });
                if (window.console) {
                    console.error('Spare part save failed', error);
                }
            } finally {
                if (primaryButton) {
                    primaryButton.disabled = false;
                }
            }
        }

        updateSparePartState(existingName, payload, responseMessage) {
            const docname = responseMessage?.name || existingName || payload.part_code;
            if (!docname) {
                return;
            }
            const partCode = responseMessage?.part_code || payload.part_code || existingName;
            const merged = { ...(this.lookupSparePart(existingName) || {}), ...payload };
            merged.name = docname;
            if (partCode) {
                merged.part_code = partCode;
            }
            if (Object.prototype.hasOwnProperty.call(responseMessage, 'stock_qty')) {
                merged.stock_qty = responseMessage.stock_qty;
            }
            if (Object.prototype.hasOwnProperty.call(responseMessage, 'unit_price')) {
                merged.unit_price = responseMessage.unit_price;
            }

            const index = this.sparePartCatalog.findIndex((part) => part.name === docname || part.name === existingName);
            if (index >= 0) {
                this.sparePartCatalog.splice(index, 1, merged);
            } else {
                this.sparePartCatalog.push(merged);
            }
            this.state.spare_parts = [...this.sparePartCatalog];
            this.sparePartIndex = new Map();
            this.sparePartCatalog.forEach((part) => {
                if (part?.name) {
                    this.sparePartIndex.set(part.name, part);
                }
                if (part?.part_code) {
                    this.sparePartIndex.set(part.part_code, part);
                }
            });

            const query = this.inputs.spareSearch ? this.inputs.spareSearch.value || '' : '';
            this.applySpareSearch(query, true);
            this.renderSpareRequestsTable(this.asArray(this.state.service_orders));
            this.updateSpareMetrics();
            this.selectSparePart(docname, { focusForm: false });
        }

        createStatusBadge(status) {
            const badge = document.createElement('span');
            badge.className = 'status-pill';
            const label = status || __('Tidak diketahui');
            badge.textContent = label;
            const normalized = label.toString().toLowerCase();
            if (
                normalized.includes('available') ||
                normalized.includes('received') ||
                normalized.includes('issued') ||
                normalized.includes('approve')
            ) {
                badge.classList.add('status-pill--success');
            } else if (
                normalized.includes('order') ||
                normalized.includes('pending') ||
                normalized.includes('transit')
            ) {
                badge.classList.add('status-pill--warning');
            } else if (
                normalized.includes('cancel') ||
                normalized.includes('stop') ||
                normalized.includes('reject') ||
                normalized.includes('backorder')
            ) {
                badge.classList.add('status-pill--danger');
            }
            return badge;
        }

        formatStockValue(value) {
            const numeric = parseFloat(value);
            if (Number.isNaN(numeric)) {
                return '';
            }
            if (Number.isInteger(numeric)) {
                return numeric.toLocaleString('id-ID');
            }
            return numeric.toLocaleString('id-ID', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
        }

        formatQuantityDisplay(qty, uom) {
            const numeric = parseFloat(qty);
            if (!Number.isNaN(numeric)) {
                const formatted = Number.isInteger(numeric)
                    ? numeric.toLocaleString('id-ID')
                    : numeric.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return `${formatted} ${uom || ''}`.trim();
            }
            if (qty && uom) {
                return `${qty} ${uom}`.trim();
            }
            return qty || uom || '';
        }

        isOutOfStock(part) {
            if (!part) {
                return false;
            }
            const stock = parseFloat(part.stock_qty);
            if (!Number.isFinite(stock)) {
                return false;
            }
            return stock <= 0;
        }

        isLowStock(part) {
            if (!part) {
                return false;
            }
            const stock = parseFloat(part.stock_qty);
            if (!Number.isFinite(stock)) {
                return false;
            }
            if (stock <= 0) {
                return true;
            }
            const reorder = parseFloat(part.reorder_level);
            if (!Number.isFinite(reorder) || reorder <= 0) {
                return false;
            }
            return stock <= reorder;
        }

        renderProcurement() {
            const pending = this.asArray(this.state.pending_procurement);
            this.renderTable(this.tables.pendingProcurement, pending, (row) => [
                this.renderLink('Garage Procurement Order', row.name),
                row.supplier || '-',
                row.status || '-',
                row.expected_date || '-',
            ], this.emptyStates.pendingProcurement);
        }

        renderFinance() {
            const invoices = this.asArray(this.state.open_invoices);
            const payments = this.asArray(this.state.payment_entries);

            const totals = this.state.totals || {};
            this.updateMetric(this.metrics.invoiceTotal, totals.invoice_total || 0);
            this.updateMetric(this.metrics.outstandingTotal, totals.outstanding_total || 0);
            this.updateMetric(this.metrics.paymentsTotal, totals.payments_total || 0);

            this.renderTable(this.tables.openInvoices, invoices, (row) => [
                this.renderLink('Garage Sales Invoice', row.name),
                row.customer || '-',
                row.due_date || '-',
                this.currencyFormatter.format(parseFloat(row.outstanding_amount) || 0),
            ], this.emptyStates.openInvoice);

            this.renderTable(this.tables.payments, payments, (row) => [
                this.renderLink('Garage Payment Entry', row.name),
                row.customer || '-',
                row.payment_date || '-',
                row.mode_of_payment || '-',
            ], this.emptyStates.payment);

            const receiptOptions = payments.map((row) => ({
                value: row.name,
                label: `${row.name} – ${row.customer || '-'}`,
            }));
            this.populateSelect(this.selects.receiptPaymentEntry, receiptOptions, {
                blankLabel: '— Pilih payment entry —',
            });
        }

        renderStatusSummary() {
            const summary = this.state.status_summary || {};
            Object.entries(summary).forEach(([key, data]) => {
                this.renderStatusList(key.replace(/_/g, '-'), data);
            });
        }

        renderStatusList(key, summary) {
            const lists = this.statusLists[key];
            if (!lists) {
                return;
            }
            lists.forEach((list) => {
                list.innerHTML = '';
                const entries = Object.entries(summary || {});
                if (!entries.length) {
                    const item = document.createElement('li');
                    item.textContent = __('Tidak ada data');
                    list.appendChild(item);
                    return;
                }
                entries.forEach(([status, total]) => {
                    const item = document.createElement('li');
                    const label = document.createElement('span');
                    label.textContent = status || __('Tidak diketahui');
                    const value = document.createElement('span');
                    value.className = 'badge';
                    value.textContent = total;
                    item.appendChild(label);
                    item.appendChild(value);
                    if (key === 'service-orders') {
                        item.classList.add('status-list__item--interactive');
                        item.setAttribute('role', 'button');
                        item.setAttribute('tabindex', '0');
                        const openModal = () => this.openServiceStatusModal(status);
                        item.addEventListener('click', openModal);
                        item.addEventListener('keydown', (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                openModal();
                            }
                        });
                    }
                    list.appendChild(item);
                });
            });
        }

        escapeHtml(value) {
            if (value === undefined || value === null) {
                return '';
            }
            return value
                .toString()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        renderTable(table, rows, rowRenderer, emptyState) {
            if (!table) {
                return;
            }
            table.innerHTML = '';
            if (!rows.length) {
                if (emptyState) {
                    emptyState.style.display = 'block';
                }
                return;
            }
            if (emptyState) {
                emptyState.style.display = 'none';
            }
            rows.forEach((row) => {
                const tr = document.createElement('tr');
                rowRenderer(row).forEach((cellValue) => {
                    const td = document.createElement('td');
                    if (cellValue instanceof HTMLElement) {
                        td.appendChild(cellValue);
                    } else {
                        td.innerHTML = cellValue ?? '-';
                    }
                    tr.appendChild(td);
                });
                table.appendChild(tr);
            });
        }

        handleBootstrapFailure(error) {
            if (window.frappe && frappe.show_alert) {
                frappe.show_alert({
                    message: __('Gagal memuat data portal. Pastikan Anda sudah login lalu coba lagi.'),
                    indicator: 'red',
                });
            }
            if (window.console && console.error) {
                console.error('Garage portal bootstrap failed', error);
            }
            this.state = {};
            this.render();
            this.showTableStatus(
                this.tables.customerVehicles,
                __('Tidak dapat memuat data master. Silakan refresh halaman.'),
                this.emptyStates.customerVehicles
            );
        }

        showTableStatus(table, message, emptyState) {
            if (!table) {
                return;
            }
            const columns = this.getColumnCount(table);
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = columns;
            cell.textContent = message;
            cell.style.textAlign = 'center';
            cell.style.padding = '2rem';
            cell.style.color = 'var(--text-muted)';
            row.appendChild(cell);
            table.innerHTML = '';
            table.appendChild(row);
            if (emptyState) {
                emptyState.style.display = 'none';
            }
        }

        getColumnCount(tableBody) {
            const table = tableBody ? tableBody.closest('table') : null;
            if (table) {
                const headers = table.querySelectorAll('thead th');
                if (headers.length) {
                    return headers.length;
                }
            }
            const sampleRow = tableBody ? tableBody.querySelector('tr') : null;
            if (sampleRow) {
                return sampleRow.children.length || 1;
            }
            return 1;
        }

        asArray(value) {
            if (Array.isArray(value)) {
                return value;
            }
            if (!value) {
                return [];
            }
            if (typeof value === 'object') {
                return Object.values(value);
            }
            return [];
        }

        openServiceStatusModal(status) {
            if (!this.statusModal?.container) {
                return;
            }

            const safeStatus = status || __('Tidak diketahui');
            const normalizedStatus = (status || '').toLowerCase();
            const matching = this.cachedServiceOrders.filter(
                (order) => (order.status || '').toLowerCase() === normalizedStatus
            );

            if (this.statusModal.title) {
                this.statusModal.title.textContent = `Detail Status Servis – ${safeStatus}`;
            }

            if (this.statusModal.summary) {
                if (matching.length) {
                    const totalEstimate = matching.reduce(
                        (sum, order) => sum + (parseFloat(order.total_estimated_amount) || 0),
                        0
                    );
                    this.statusModal.summary.textContent = `${matching.length} service order dengan status ${safeStatus}. Total estimasi pekerjaan ${this.currencyFormatter.format(totalEstimate)}.`;
                } else {
                    this.statusModal.summary.textContent = `Tidak ada service order dengan status ${safeStatus}.`;
                }
            }

            if (this.statusModal.tableBody) {
                this.statusModal.tableBody.innerHTML = '';
            }

            if (matching.length && this.statusModal.tableBody) {
                matching.forEach((order) => {
                    const row = document.createElement('tr');
                    const cells = [
                        this.renderLink('Garage Service Order', order.name),
                        order.customer || '-',
                        order.vehicle || '-',
                        order.priority || '-',
                        order.status || '-',
                        this.formatTimestamp(order.service_booking_date),
                        this.formatTimestamp(order.estimated_delivery_date),
                        this.formatTimestamp(order.actual_delivery_date),
                        order.qc_status || '-',
                    ];
                    cells.forEach((cellValue) => {
                        const cell = document.createElement('td');
                        if (cellValue instanceof HTMLElement) {
                            cell.appendChild(cellValue);
                        } else {
                            cell.textContent = cellValue;
                        }
                        row.appendChild(cell);
                    });
                    this.statusModal.tableBody.appendChild(row);
                });
            }

            if (this.statusModal.tableWrapper) {
                this.statusModal.tableWrapper.style.display = matching.length ? 'block' : 'none';
            }
            if (this.statusModal.emptyState) {
                this.statusModal.emptyState.classList.toggle('is-visible', !matching.length);
            }

            this.previousFocus = document.activeElement;
            this.statusModal.container.classList.add('is-open');
            this.statusModal.container.setAttribute('aria-hidden', 'false');
            this.bodyOverflowCache = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', this.handleStatusModalKeydown);

            const closeButton = this.statusModal.container.querySelector('.portal-modal__close');
            if (closeButton) {
                closeButton.focus();
            }
        }

        closeStatusModal() {
            if (!this.statusModal?.container) {
                return;
            }
            this.statusModal.container.classList.remove('is-open');
            this.statusModal.container.setAttribute('aria-hidden', 'true');
            document.removeEventListener('keydown', this.handleStatusModalKeydown);
            if (typeof this.bodyOverflowCache === 'string') {
                document.body.style.overflow = this.bodyOverflowCache;
            } else {
                document.body.style.removeProperty('overflow');
            }
            if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
                this.previousFocus.focus();
            }
        }

        handleStatusModalKeydown(event) {
            if (event.key === 'Escape') {
                this.closeStatusModal();
            }
        }

        renderLink(doctype, name, label) {
            const link = document.createElement('a');
            link.href = this.getFormRoute(doctype, name);
            link.target = '_blank';
            link.textContent = label || name;
            return link;
        }

        formatTimestamp(value) {
            if (!value) {
                return '-';
            }
            try {
                return frappe.datetime.str_to_user(value);
            } catch (error) {
                return value;
            }
        }

        updateMetric(node, value) {
            if (!node) {
                return;
            }
            const numeric = parseFloat(value) || 0;
            node.textContent = this.currencyFormatter.format(numeric);
        }

        collectFormData(form, fields) {
            const data = {};
            fields.forEach((fieldname) => {
                const inputs = form.querySelectorAll(`[name="${fieldname}"]`);
                if (!inputs.length) {
                    return;
                }
                const primary = inputs[0];
                if (primary instanceof HTMLInputElement && primary.type === 'radio') {
                    const checked = form.querySelector(`input[name="${fieldname}"]:checked`);
                    if (checked && !checked.disabled) {
                        const value = this.readInputValue(checked);
                        if (value !== null && value !== '') {
                            data[fieldname] = value;
                        }
                    }
                    return;
                }
                const input = primary;
                if (!input || input.disabled) {
                    return;
                }
                const value = this.readInputValue(input);
                if (value !== null && value !== '') {
                    data[fieldname] = value;
                }
            });

            form.querySelectorAll('[data-repeat]').forEach((group) => {
                const key = group.getAttribute('data-repeat');
                const rows = [];
                group.querySelectorAll('.repeat-row').forEach((row) => {
                    const payload = {};
                    row.querySelectorAll('[data-field]').forEach((input) => {
                        const fieldname = input.getAttribute('data-field');
                        const value = this.readInputValue(input);
                        if (value !== null && value !== '') {
                            payload[fieldname] = value;
                        }
                    });
                    if (Object.keys(payload).length) {
                        rows.push(payload);
                    }
                });
                if (rows.length) {
                    data[key] = rows;
                }
            });

            return data;
        }

        readInputValue(input) {
            if (input.type === 'checkbox') {
                return input.checked;
            }
            const raw = input.value;
            if (raw === '') {
                return null;
            }
            if (input.type === 'datetime-local') {
                const parts = raw.split('T');
                if (parts.length === 2) {
                    const timePart = parts[1].length === 5 ? `${parts[1]}:00` : parts[1];
                    return `${parts[0]} ${timePart}`;
                }
            }
            const cast = input.dataset.cast;
            if (cast === 'float') {
                return parseFloat(raw);
            }
            if (cast === 'int') {
                return parseInt(raw, 10);
            }
            return raw;
        }

        scheduleBootstrapRefresh(delay = 800) {
            if (this.bootstrapRefreshHandle) {
                clearTimeout(this.bootstrapRefreshHandle);
            }
            this.bootstrapRefreshHandle = setTimeout(() => {
                this.bootstrapRefreshHandle = null;
                this.fetchBootstrap(false, false);
            }, delay);
        }

        submitForm(form, method, args, successMessage, options = {}) {
            const opts = options || {};
            const primaryButton = form.querySelector('button.primary');
            if (primaryButton) {
                primaryButton.disabled = true;
            }
            frappe.call({
                method,
                args,
                freeze: true,
                callback: (response) => {
                    frappe.show_alert({ message: __(successMessage), indicator: 'green' });
                    if (typeof opts.onSuccess === 'function') {
                        try {
                            opts.onSuccess(response);
                        } catch (error) {
                            console.error('Post-submit handler failed', error);
                        }
                    }
                    this.resetForm(form);
                    this.fetchBootstrap(false);
                },
                always: () => {
                    if (primaryButton) {
                        primaryButton.disabled = false;
                    }
                },
            });
        }

        setEstimateDownload(pdfPayload, metadata = {}) {
            const hasContent = pdfPayload && typeof pdfPayload.content === 'string' && pdfPayload.content.trim();
            this.lastEstimatePdf = hasContent
                ? {
                      content: pdfPayload.content.trim(),
                      filename: pdfPayload.filename || 'estimasi-service.pdf',
                      mime_type: pdfPayload.mime_type || 'application/pdf',
                  }
                : null;

            if (metadata && Object.prototype.hasOwnProperty.call(metadata, 'service_order')) {
                const orderValue = metadata.service_order;
                if (orderValue === undefined || orderValue === null || String(orderValue).trim() === '') {
                    this.lastEstimateServiceOrder = null;
                } else {
                    this.lastEstimateServiceOrder = String(orderValue).trim();
                }
            }

            const button = this.buttons?.downloadEstimate;
            if (!button) {
                return;
            }

            const hasDownloadSource = Boolean(this.lastEstimatePdf || this.lastEstimateServiceOrder);

            if (hasDownloadSource) {
                button.hidden = false;
                button.disabled = false;
                button.setAttribute('aria-disabled', 'false');
            } else {
                button.disabled = true;
                button.setAttribute('aria-disabled', 'true');
                button.hidden = true;
            }
        }

        downloadBase64File(content, filename, mimeType = 'application/pdf') {
            console.log('🔍 downloadBase64File called');
            console.log('  Content length:', content ? content.length : 0);
            console.log('  Filename:', filename);
            console.log('  MIME type:', mimeType);
            
            if (!content) {
                console.error('❌ No content provided');
                frappe.msgprint(__('Error: PDF content kosong'));
                return;
            }
            
            try {
                // Remove data URL prefix if exists
                const sanitized = content.replace(/^data:[^,]+,/, '').trim();
                console.log('  Sanitized length:', sanitized.length);
                
                // Decode base64
                const binary = atob(sanitized);
                console.log('  Binary length:', binary.length);
                
                // Convert to array buffer
                const length = binary.length;
                const buffer = new Uint8Array(length);
                for (let index = 0; index < length; index += 1) {
                    buffer[index] = binary.charCodeAt(index);
                }
                console.log('  Buffer created, size:', buffer.byteLength, 'bytes');
                
                // Create blob
                const blob = new Blob([buffer], { type: mimeType || 'application/pdf' });
                console.log('  Blob created, size:', blob.size, 'bytes');
                
                // Create download link
                const url = URL.createObjectURL(blob);
                console.log('  Blob URL:', url);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = filename || 'download.pdf';
                link.style.display = 'none';
                
                // Append to body
                document.body.appendChild(link);
                console.log('  Link appended to body');
                
                // Trigger download
                link.click();
                console.log('✅ Download triggered');
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    console.log('  Cleanup complete');
                }, 100);
                
            } catch (error) {
                console.error('❌ Failed to download PDF:', error);
                console.error('  Error details:', error.message);
                console.error('  Stack:', error.stack);
                
                frappe.msgprint({
                    title: __('Error Download PDF'),
                    indicator: 'red',
                    message: `
                        <p><strong>Gagal mengunduh dokumen estimasi.</strong></p>
                        <p>Error: ${error.message}</p>
                        <p>Silakan:</p>
                        <ol>
                            <li>Refresh halaman (F5)</li>
                            <li>Coba lagi</li>
                            <li>Hubungi admin jika masalah berlanjut</li>
                        </ol>
                    `
                });
            }
        }

        async handleEstimateDownload() {
            if (this.lastEstimatePdf?.content) {
                this.downloadBase64File(
                    this.lastEstimatePdf.content,
                    this.lastEstimatePdf.filename,
                    this.lastEstimatePdf.mime_type
                );
                return;
            }

            const serviceOrder = this.lastEstimateServiceOrder;
            if (!serviceOrder) {
                frappe.msgprint(
                    __('Belum ada estimasi service yang bisa diunduh. Simpan intake terlebih dahulu.')
                );
                return;
            }

            try {
                const triggerButton = this.buttons?.downloadEstimate;
                if (triggerButton) {
                    triggerButton.disabled = true;
                    triggerButton.setAttribute('aria-disabled', 'true');
                }

                const response = await frappe.call({
                    method: 'garage.api.portal.generate_service_estimate_document',
                    args: { service_order: serviceOrder },
                    freeze: true,
                    freeze_message: __('Menyiapkan dokumen estimasi...'),
                });

                const payload = response?.message || {};
                const pdf = payload.estimate_pdf;
                const resolvedOrder = payload.service_order || serviceOrder;

                if (pdf?.content) {
                    this.setEstimateDownload(pdf, { service_order: resolvedOrder });
                    this.downloadBase64File(
                        pdf.content,
                        pdf.filename || 'estimasi-service.pdf',
                        pdf.mime_type || 'application/pdf'
                    );
                } else {
                    this.setEstimateDownload(null, { service_order: resolvedOrder });
                }

                const indicator = payload.indicator || 'green';
                const message =
                    payload.message || __('Dokumen estimasi service kendaraan siap diunduh.');
                const fileLink = payload.absolute_file_url || payload.file_url;

                let htmlMessage = `<p>${message}</p>`;
                if (fileLink) {
                    htmlMessage += `<p><a href="${fileLink}" target="_blank" rel="noopener">${__(
                        'Buka Lampiran Estimasi'
                    )}</a></p>`;
                }

                frappe.msgprint({
                    title: __('Estimasi Service'),
                    indicator,
                    message: htmlMessage,
                });
            } catch (error) {
                frappe.show_alert(
                    {
                        message: __('Gagal menyiapkan dokumen estimasi: {0}', [error.message || error]),
                        indicator: 'red',
                    },
                    7
                );
            } finally {
                const triggerButton = this.buttons?.downloadEstimate;
                if (triggerButton) {
                    const hasSource = Boolean(this.lastEstimatePdf || this.lastEstimateServiceOrder);
                    triggerButton.disabled = !hasSource;
                    triggerButton.setAttribute('aria-disabled', hasSource ? 'false' : 'true');
                }
            }
        }

        resetForm(form) {
            form.reset();
            form.querySelectorAll('[data-repeat]').forEach((group) => {
                const rowsContainer = group.querySelector('[data-role="rows"]');
                if (rowsContainer) {
                    rowsContainer.innerHTML = '';
                }
            });
            if (form === this.forms.intake) {
                this.manualCustomerQuery = '';
                this.updateCustomerSearchInput(null);
                if (this.selects.existingCustomer) {
                    this.setSelectValue(this.selects.existingCustomer, '');
                }
                const intakeTypeField = form.querySelector('input[name="intake_type"]');
                if (intakeTypeField) {
                    intakeTypeField.value = 'Walk-In';
                }
            }
        }

        updateServiceVehicleOptions() {
            const select = this.selects.serviceVehicle;
            if (!select) {
                return;
            }
            const vehicles = this.asArray(this.state.vehicles);
            const selectedCustomer = this.selects.serviceCustomer ? this.selects.serviceCustomer.value : '';
            const options = vehicles
                .filter((vehicle) => !selectedCustomer || vehicle.customer === selectedCustomer)
                .map((vehicle) => ({
                    value: vehicle.name,
                    label: [
                        vehicle.license_plate,
                        vehicle.brand,
                        vehicle.type_model,
                        vehicle.model,
                    ]
                        .filter(Boolean)
                        .join(' – '),
                }));
            this.populateSelect(select, options, { blankLabel: '— Pilih kendaraan —' });
        }

        setSelectValue(select, value) {
            if (!select) {
                return false;
            }
            const normalizedValue = value === undefined || value === null ? '' : String(value);
            const options = Array.from(select.options || []);
            const match = options.find((option) => option.value === normalizedValue);
            if (match) {
                select.value = normalizedValue;
                return true;
            }
            if (!normalizedValue) {
                select.value = '';
                return true;
            }
            return false;
        }

        addOptionIfMissing(select, value, label) {
            if (!select) {
                return;
            }
            const normalizedValue = value === undefined || value === null ? '' : String(value);
            if (!normalizedValue) {
                return;
            }
            const options = Array.from(select.options || []);
            if (options.some((option) => option.value === normalizedValue)) {
                return;
            }
            const option = document.createElement('option');
            option.value = normalizedValue;
            option.textContent = label || normalizedValue;
            select.appendChild(option);
        }

        ensureCustomerOptions(value, label) {
            if (!value) {
                return;
            }
            const normalizedValue = String(value);
            const displayLabel = label || normalizedValue;
            this.addOptionIfMissing(this.selects.existingCustomer, normalizedValue, displayLabel);
        }

        notifyPlateNotFound() {
            if (window.frappe && frappe.show_alert) {
                frappe.show_alert({
                    message: __('Nomor polisi belum terdaftar. Lengkapi data kendaraan secara manual.'),
                    indicator: 'yellow',
                });
            }
        }

        populateSelect(select, rows, { valueKey = 'value', labelKey = 'label', blankLabel = '—' } = {}) {
            if (!select) {
                return;
            }
            const previous = select.value;
            select.innerHTML = '';
            const blank = document.createElement('option');
            blank.value = '';
            blank.textContent = blankLabel;
            select.appendChild(blank);
            (rows || []).forEach((row) => {
                const option = document.createElement('option');
                const value = row[valueKey];
                option.value = value;
                option.textContent = row[labelKey] || value;
                select.appendChild(option);
            });
            if (previous && select.querySelector(`option[value="${previous}"]`)) {
                select.value = previous;
            }
        }

        renderRefreshedAt() {
            if (!this.refreshedAtLabel || !this.state.refreshed_at) {
                return;
            }
            try {
                this.refreshedAtLabel.textContent = frappe.datetime.str_to_user(this.state.refreshed_at);
            } catch (error) {
                this.refreshedAtLabel.textContent = this.state.refreshed_at;
            }
        }

        updateDeskLinks() {
            const routes = this.state.desk_routes || {};
            this.deskLinks.forEach((link) => {
                const doctype = link.getAttribute('data-desk-link');
                const route = routes[doctype];
                if (route) {
                    link.href = route.list;
                }
            });
        }

        getFormRoute(doctype, name) {
            const routes = this.state.desk_routes || {};
            const route = routes[doctype];
            if (route && route.form) {
                return route.form.replace('{name}', encodeURIComponent(name));
            }
            return `/app/${frappe.scrub(doctype)}/${encodeURIComponent(name)}`;
        }
    }

    frappe.ready(() => {
        const portal = new GaragePortal();
        portal.init();
    });
})();
