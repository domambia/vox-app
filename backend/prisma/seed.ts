import { PrismaClient, UserRole, User, LookingFor } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Complete list of all countries with ISO 3166-1 alpha-2 codes
const countries = [
  { code: 'AD', name: 'Andorra' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AI', name: 'Anguilla' },
  { code: 'AL', name: 'Albania' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AO', name: 'Angola' },
  { code: 'AQ', name: 'Antarctica' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AS', name: 'American Samoa' },
  { code: 'AT', name: 'Austria' },
  { code: 'AU', name: 'Australia' },
  { code: 'AW', name: 'Aruba' },
  { code: 'AX', name: 'Åland Islands' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BI', name: 'Burundi' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BL', name: 'Saint Barthélemy' },
  { code: 'BM', name: 'Bermuda' },
  { code: 'BN', name: 'Brunei Darussalam' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BQ', name: 'Bonaire, Sint Eustatius and Saba' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BV', name: 'Bouvet Island' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BZ', name: 'Belize' },
  { code: 'CA', name: 'Canada' },
  { code: 'CC', name: 'Cocos (Keeling) Islands' },
  { code: 'CD', name: 'Congo, Democratic Republic of the' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'CG', name: 'Congo' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'CK', name: 'Cook Islands' },
  { code: 'CL', name: 'Chile' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'CW', name: 'Curaçao' },
  { code: 'CX', name: 'Christmas Island' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DE', name: 'Germany' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EE', name: 'Estonia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'EH', name: 'Western Sahara' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'ES', name: 'Spain' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FK', name: 'Falkland Islands (Malvinas)' },
  { code: 'FM', name: 'Micronesia, Federated States of' },
  { code: 'FO', name: 'Faroe Islands' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GE', name: 'Georgia' },
  { code: 'GF', name: 'French Guiana' },
  { code: 'GG', name: 'Guernsey' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GI', name: 'Gibraltar' },
  { code: 'GL', name: 'Greenland' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GP', name: 'Guadeloupe' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'GR', name: 'Greece' },
  { code: 'GS', name: 'South Georgia and the South Sandwich Islands' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GU', name: 'Guam' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HM', name: 'Heard Island and McDonald Islands' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HR', name: 'Croatia' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HU', name: 'Hungary' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IM', name: 'Isle of Man' },
  { code: 'IN', name: 'India' },
  { code: 'IO', name: 'British Indian Ocean Territory' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IR', name: 'Iran, Islamic Republic of' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IT', name: 'Italy' },
  { code: 'JE', name: 'Jersey' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JO', name: 'Jordan' },
  { code: 'JP', name: 'Japan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KM', name: 'Comoros' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'KP', name: 'Korea, Democratic People\'s Republic of' },
  { code: 'KR', name: 'Korea, Republic of' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KY', name: 'Cayman Islands' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'LA', name: 'Lao People\'s Democratic Republic' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LY', name: 'Libya' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MD', name: 'Moldova, Republic of' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MF', name: 'Saint Martin (French part)' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'ML', name: 'Mali' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'MO', name: 'Macao' },
  { code: 'MP', name: 'Northern Mariana Islands' },
  { code: 'MQ', name: 'Martinique' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MS', name: 'Montserrat' },
  { code: 'MT', name: 'Malta' }, // Only allowed country
  { code: 'MU', name: 'Mauritius' },
  { code: 'MV', name: 'Maldives' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NC', name: 'New Caledonia' },
  { code: 'NE', name: 'Niger' },
  { code: 'NF', name: 'Norfolk Island' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NU', name: 'Niue' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'OM', name: 'Oman' },
  { code: 'PA', name: 'Panama' },
  { code: 'PE', name: 'Peru' },
  { code: 'PF', name: 'French Polynesia' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PL', name: 'Poland' },
  { code: 'PM', name: 'Saint Pierre and Miquelon' },
  { code: 'PN', name: 'Pitcairn' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'PS', name: 'Palestine, State of' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PW', name: 'Palau' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RE', name: 'Réunion' },
  { code: 'RO', name: 'Romania' },
  { code: 'RS', name: 'Serbia' },
  { code: 'RU', name: 'Russian Federation' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SH', name: 'Saint Helena, Ascension and Tristan da Cunha' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SJ', name: 'Svalbard and Jan Mayen' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SM', name: 'San Marino' },
  { code: 'SN', name: 'Senegal' },
  { code: 'SO', name: 'Somalia' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'SX', name: 'Sint Maarten (Dutch part)' },
  { code: 'SY', name: 'Syrian Arab Republic' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'TC', name: 'Turks and Caicos Islands' },
  { code: 'TD', name: 'Chad' },
  { code: 'TF', name: 'French Southern Territories' },
  { code: 'TG', name: 'Togo' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TK', name: 'Tokelau' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'TW', name: 'Taiwan, Province of China' },
  { code: 'TZ', name: 'Tanzania, United Republic of' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UM', name: 'United States Minor Outlying Islands' },
  { code: 'US', name: 'United States of America' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VA', name: 'Holy See (Vatican City State)' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'VE', name: 'Venezuela, Bolivarian Republic of' },
  { code: 'VG', name: 'Virgin Islands, British' },
  { code: 'VI', name: 'Virgin Islands, U.S.' },
  { code: 'VN', name: 'Viet Nam' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'WF', name: 'Wallis and Futuna' },
  { code: 'WS', name: 'Samoa' },
  { code: 'YE', name: 'Yemen' },
  { code: 'YT', name: 'Mayotte' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

async function main() {
  console.log('🌍 Seeding countries...');

  // Upsert all countries
  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {
        name: country.name,
        // Only Malta (MT) is allowed by default
        is_allowed: country.code === 'MT',
      },
      create: {
        code: country.code,
        name: country.name,
        // Only Malta (MT) is allowed by default
        is_allowed: country.code === 'MT',
      },
    });
  }

  console.log(`✅ Seeded ${countries.length} countries`);
  console.log('✅ Malta (MT) is set as the only allowed country');

  // Seed test users for all roles and auth scenarios
  console.log('\n👤 Seeding test users...');

  const defaultPassword = 'password123';
  const defaultPasswordHash = await hashPassword(defaultPassword);

  // Ensure Malta exists (should already exist from above)
  const malta = await prisma.country.findUnique({
    where: { code: 'MT' },
  });

  if (!malta) {
    throw new Error('Malta (MT) country must exist before seeding users');
  }

  const usersToSeed = [
    {
      label: 'USER',
      phone_number: '+35699123456',
      first_name: 'Test',
      last_name: 'User',
      email: 'testuser@vox.app',
      verified: true,
      role: UserRole.USER,
      is_active: true,
      password_hash: defaultPasswordHash,
    },
    {
      label: 'MODERATOR',
      phone_number: '+35699234567',
      first_name: 'Test',
      last_name: 'Moderator',
      email: 'testmoderator@vox.app',
      verified: true,
      role: UserRole.MODERATOR,
      is_active: true,
      password_hash: defaultPasswordHash,
    },
    {
      label: 'ADMIN',
      phone_number: '+35699345678',
      first_name: 'Test',
      last_name: 'Admin',
      email: 'testadmin@vox.app',
      verified: true,
      role: UserRole.ADMIN,
      is_active: true,
      password_hash: defaultPasswordHash,
    },
    {
      label: 'OTP_ONLY',
      phone_number: '+35699456789',
      first_name: 'OTP',
      last_name: 'Only',
      email: 'otponly@vox.app',
      verified: true,
      role: UserRole.USER,
      is_active: true,
      password_hash: null,
    },
    {
      label: 'UNVERIFIED',
      phone_number: '+35699567890',
      first_name: 'Unverified',
      last_name: 'User',
      email: 'unverified@vox.app',
      verified: false,
      role: UserRole.USER,
      is_active: true,
      password_hash: defaultPasswordHash,
    },
    {
      label: 'INACTIVE',
      phone_number: '+35699678901',
      first_name: 'Inactive',
      last_name: 'User',
      email: 'inactive@vox.app',
      verified: true,
      role: UserRole.USER,
      is_active: false,
      password_hash: defaultPasswordHash,
    },
  ];

  const seededUsers: Array<{ label: string; user: User }> = [];
  for (const user of usersToSeed) {
    const seededUser = await prisma.user.upsert({
      where: { phone_number: user.phone_number },
      update: {
        password_hash: user.password_hash,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        country_code: 'MT',
        verified: user.verified,
        verification_date: user.verified ? new Date() : null,
        role: user.role,
        is_active: user.is_active,
      },
      create: {
        phone_number: user.phone_number,
        password_hash: user.password_hash,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        country_code: 'MT',
        verified: user.verified,
        verification_date: user.verified ? new Date() : null,
        role: user.role,
        is_active: user.is_active,
      },
    });

    seededUsers.push({ label: user.label, user: seededUser });
  }

  console.log('✅ Seeded test users:');
  for (const { label, user } of seededUsers) {
    const emailInfo = user.email ? ` (${user.email})` : '';
    console.log(`   - ${label}: ${user.phone_number}${emailInfo}`);
  }
  console.log(`\n🔑 Default password for password-based users: ${defaultPassword}`);
  console.log('   - OTP_ONLY has no password (OTP login only)');

  // Profile data for each seeded user (bio, interests, location, looking_for per schema).
  // If running in Docker and you only see countries + users, rebuild: docker compose build backend && docker compose up -d
  const profileData: Array<{
    phone_number: string;
    bio: string;
    interests: string[];
    location: string;
    looking_for: LookingFor;
  }> = [
    {
      phone_number: '+35699123456',
      bio: 'Voice-first enthusiast. Love hiking and live music. Always up for a coffee chat.',
      interests: ['hiking', 'music', 'coffee', 'accessibility'],
      location: 'Valletta, Malta',
      looking_for: LookingFor.FRIENDSHIP,
    },
    {
      phone_number: '+35699234567',
      bio: 'Community moderator. Into tech and inclusive events.',
      interests: ['tech', 'events', 'community'],
      location: 'Sliema, Malta',
      looking_for: LookingFor.ALL,
    },
    {
      phone_number: '+35699345678',
      bio: 'Admin at VOX. Here to help the community grow.',
      interests: ['community', 'support'],
      location: 'Malta',
      looking_for: LookingFor.ALL,
    },
    {
      phone_number: '+35699456789',
      bio: 'OTP-only user. Prefer quick voice intros.',
      interests: ['voice', 'meetups'],
      location: 'St. Julian\'s, Malta',
      looking_for: LookingFor.HOBBY,
    },
    {
      phone_number: '+35699567890',
      bio: 'New here. Still setting up my profile.',
      interests: [],
      location: 'Malta',
      looking_for: LookingFor.ALL,
    },
    {
      phone_number: '+35699678901',
      bio: 'Inactive account. Was into photography and travel.',
      interests: ['photography', 'travel'],
      location: 'Gozo, Malta',
      looking_for: LookingFor.DATING,
    },
  ];

  console.log('\n📋 Seeding profiles for users...');
  for (const data of profileData) {
    const user = seededUsers.find((u) => u.user.phone_number === data.phone_number)?.user;
    if (!user) continue;
    await prisma.profile.upsert({
      where: { user_id: user.user_id },
      update: {
        bio: data.bio,
        interests: data.interests,
        location: data.location,
        looking_for: data.looking_for,
      },
      create: {
        user_id: user.user_id,
        bio: data.bio,
        interests: data.interests,
        location: data.location,
        looking_for: data.looking_for,
      },
    });
  }
  console.log(`✅ Seeded ${profileData.length} profiles`);

  // Comprehensive social data: groups, events, conversations/messages, friendships, likes, matches, voice call, KYC
  const testUser = seededUsers.find((u) => u.label === 'USER')?.user;
  const otpUser = seededUsers.find((u) => u.label === 'OTP_ONLY')?.user;
  const modUser = seededUsers.find((u) => u.label === 'MODERATOR')?.user;
  const adminUser = seededUsers.find((u) => u.label === 'ADMIN')?.user;
  const unverifiedUser = seededUsers.find((u) => u.label === 'UNVERIFIED')?.user;
  const inactiveUser = seededUsers.find((u) => u.label === 'INACTIVE')?.user;

  if (!testUser || !otpUser || !modUser || !adminUser) {
    console.log('\n⚠️ Skipping social seed: required users not found');
  } else {
    console.log('\n👥 Seeding groups, events, messages, friendships, likes, matches, voice call, KYC...');

    const orderedPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

    // —— Groups (2 groups; 5 users in at least one group) ——
    const groupCommunity = await prisma.group.upsert({
      where: { group_id: 'seed-group-vox-community' },
      update: { name: 'VOX Community', description: 'Main community group for VOX users.', category: 'Community', member_count: 4 },
      create: {
        group_id: 'seed-group-vox-community',
        name: 'VOX Community',
        description: 'Main community group for VOX users.',
        category: 'Community',
        creator_id: modUser.user_id,
        is_public: true,
        member_count: 0,
      },
    });

    for (const { userId, role } of [
      { userId: modUser.user_id, role: 'ADMIN' as const },
      { userId: testUser.user_id, role: 'MEMBER' as const },
      { userId: otpUser.user_id, role: 'MEMBER' as const },
      ...(unverifiedUser ? [{ userId: unverifiedUser.user_id, role: 'MEMBER' as const }] : []),
    ]) {
      await prisma.groupMember.upsert({
        where: { group_id_user_id: { group_id: groupCommunity.group_id, user_id: userId } },
        update: {},
        create: { group_id: groupCommunity.group_id, user_id: userId, role },
      });
    }
    await prisma.group.update({
      where: { group_id: groupCommunity.group_id },
      data: { member_count: unverifiedUser ? 4 : 3 },
    });

    const groupAdmins = await prisma.group.upsert({
      where: { group_id: 'seed-group-vox-admins' },
      update: { name: 'VOX Admins', description: 'Admin & moderator group.', category: 'Admin', member_count: 3 },
      create: {
        group_id: 'seed-group-vox-admins',
        name: 'VOX Admins',
        description: 'Admin & moderator group.',
        category: 'Admin',
        creator_id: adminUser.user_id,
        is_public: false,
        member_count: 0,
      },
    });
    for (const { userId, role } of [
      { userId: adminUser.user_id, role: 'ADMIN' as const },
      { userId: modUser.user_id, role: 'MODERATOR' as const },
      { userId: testUser.user_id, role: 'MEMBER' as const },
    ]) {
      await prisma.groupMember.upsert({
        where: { group_id_user_id: { group_id: groupAdmins.group_id, user_id: userId } },
        update: {},
        create: { group_id: groupAdmins.group_id, user_id: userId, role },
      });
    }
    await prisma.group.update({
      where: { group_id: groupAdmins.group_id },
      data: { member_count: 3 },
    });

    // —— Events (2 events; multiple RSVPs across users) ——
    const eventDate1 = new Date();
    eventDate1.setDate(eventDate1.getDate() + 7);
    const eventMeetup = await prisma.event.upsert({
      where: { event_id: 'seed-event-meetup' },
      update: { title: 'VOX Voice Meetup', description: 'Monthly voice-first meetup.', date_time: eventDate1, location: 'Valletta', attendee_count: 3 },
      create: {
        event_id: 'seed-event-meetup',
        group_id: groupCommunity.group_id,
        creator_id: modUser.user_id,
        title: 'VOX Voice Meetup',
        description: 'Monthly voice-first meetup.',
        date_time: eventDate1,
        location: 'Valletta',
        attendee_count: 0,
      },
    });
    for (const userId of [modUser.user_id, testUser.user_id, otpUser.user_id]) {
      await prisma.eventRSVP.upsert({
        where: { event_id_user_id: { event_id: eventMeetup.event_id, user_id: userId } },
        update: {},
        create: { event_id: eventMeetup.event_id, user_id: userId, status: 'GOING' },
      });
    }
    await prisma.event.update({
      where: { event_id: eventMeetup.event_id },
      data: { attendee_count: 3 },
    });

    const eventDate2 = new Date();
    eventDate2.setDate(eventDate2.getDate() + 14);
    const eventQa = await prisma.event.upsert({
      where: { event_id: 'seed-event-admin-qa' },
      update: { title: 'Admin Q&A', description: 'Monthly admin Q&A session.', date_time: eventDate2, location: 'Online', attendee_count: 3 },
      create: {
        event_id: 'seed-event-admin-qa',
        group_id: groupAdmins.group_id,
        creator_id: adminUser.user_id,
        title: 'Admin Q&A',
        description: 'Monthly admin Q&A session.',
        date_time: eventDate2,
        location: 'Online',
        attendee_count: 0,
      },
    });
    for (const userId of [adminUser.user_id, modUser.user_id, otpUser.user_id]) {
      await prisma.eventRSVP.upsert({
        where: { event_id_user_id: { event_id: eventQa.event_id, user_id: userId } },
        update: {},
        create: { event_id: eventQa.event_id, user_id: userId, status: 'GOING' },
      });
    }
    await prisma.event.update({
      where: { event_id: eventQa.event_id },
      data: { attendee_count: 3 },
    });

    // —— Conversations & Messages ——
    const convUserOtp = orderedPair(testUser.user_id, otpUser.user_id);
    const conv1 = await prisma.conversation.upsert({
      where: { user_a_id_user_b_id: { user_a_id: convUserOtp[0], user_b_id: convUserOtp[1] } },
      update: {},
      create: { user_a_id: convUserOtp[0], user_b_id: convUserOtp[1] },
    });
    const messages1 = [
      { sender_id: testUser.user_id, content: 'Hey! Nice to match with you.' },
      { sender_id: otpUser.user_id, content: 'Hi! Same here, voice-first is the way.' },
      { sender_id: testUser.user_id, content: 'Want to join the Voice Meetup next week?' },
      { sender_id: otpUser.user_id, content: 'Yes, already RSVP\'d. See you there!' },
    ];
    const existingCount1 = await prisma.message.count({ where: { conversation_id: conv1.conversation_id } });
    let lastMsgAt: Date | null = null;
    if (existingCount1 === 0) {
      for (const m of messages1) {
        const msg = await prisma.message.create({
          data: { conversation_id: conv1.conversation_id, sender_id: m.sender_id, content: m.content, message_type: 'TEXT' },
        });
        lastMsgAt = msg.created_at;
      }
      await prisma.conversation.update({
        where: { conversation_id: conv1.conversation_id },
        data: { last_message_at: lastMsgAt },
      });
    }

    const convModUser = orderedPair(modUser.user_id, testUser.user_id);
    const conv2 = await prisma.conversation.upsert({
      where: { user_a_id_user_b_id: { user_a_id: convModUser[0], user_b_id: convModUser[1] } },
      update: {},
      create: { user_a_id: convModUser[0], user_b_id: convModUser[1] },
    });
    const messages2 = [
      { sender_id: modUser.user_id, content: 'Thanks for joining VOX Community!' },
      { sender_id: testUser.user_id, content: 'Happy to be here.' },
      { sender_id: modUser.user_id, content: 'See you at the meetup.' },
    ];
    const existingCount2 = await prisma.message.count({ where: { conversation_id: conv2.conversation_id } });
    lastMsgAt = null;
    if (existingCount2 === 0) {
      for (const m of messages2) {
        const msg = await prisma.message.create({
          data: { conversation_id: conv2.conversation_id, sender_id: m.sender_id, content: m.content, message_type: 'TEXT' },
        });
        lastMsgAt = msg.created_at;
      }
      await prisma.conversation.update({
        where: { conversation_id: conv2.conversation_id },
        data: { last_message_at: lastMsgAt },
      });
    }

    const convAdminMod = orderedPair(adminUser.user_id, modUser.user_id);
    const conv3 = await prisma.conversation.upsert({
      where: { user_a_id_user_b_id: { user_a_id: convAdminMod[0], user_b_id: convAdminMod[1] } },
      update: {},
      create: { user_a_id: convAdminMod[0], user_b_id: convAdminMod[1] },
    });
    const messages3 = [
      { sender_id: adminUser.user_id, content: 'Can you review the new event setup?' },
      { sender_id: modUser.user_id, content: 'Done. Looks good.' },
    ];
    const existingCount3 = await prisma.message.count({ where: { conversation_id: conv3.conversation_id } });
    lastMsgAt = null;
    if (existingCount3 === 0) {
      for (const m of messages3) {
        const msg = await prisma.message.create({
          data: { conversation_id: conv3.conversation_id, sender_id: m.sender_id, content: m.content, message_type: 'TEXT' },
        });
        lastMsgAt = msg.created_at;
      }
      await prisma.conversation.update({
        where: { conversation_id: conv3.conversation_id },
        data: { last_message_at: lastMsgAt },
      });
    }

    // —— Friendships ——
    const [ua1, ub1] = orderedPair(testUser.user_id, otpUser.user_id);
    await prisma.friendship.upsert({
      where: { user_a_id_user_b_id: { user_a_id: ua1, user_b_id: ub1 } },
      update: {},
      create: { user_a_id: ua1, user_b_id: ub1, status: 'ACCEPTED' },
    });
    const [ua2, ub2] = orderedPair(modUser.user_id, testUser.user_id);
    await prisma.friendship.upsert({
      where: { user_a_id_user_b_id: { user_a_id: ua2, user_b_id: ub2 } },
      update: {},
      create: { user_a_id: ua2, user_b_id: ub2, status: 'ACCEPTED' },
    });
    const [ua3, ub3] = orderedPair(adminUser.user_id, modUser.user_id);
    await prisma.friendship.upsert({
      where: { user_a_id_user_b_id: { user_a_id: ua3, user_b_id: ub3 } },
      update: {},
      create: { user_a_id: ua3, user_b_id: ub3, status: 'PENDING' },
    });
    if (unverifiedUser) {
      const [ua4, ub4] = orderedPair(unverifiedUser.user_id, testUser.user_id);
      await prisma.friendship.upsert({
        where: { user_a_id_user_b_id: { user_a_id: ua4, user_b_id: ub4 } },
        update: {},
        create: { user_a_id: ua4, user_b_id: ub4, status: 'PENDING' },
      });
    }

    // —— Likes & Matches ——
    await prisma.like.upsert({
      where: { liker_id_liked_id: { liker_id: testUser.user_id, liked_id: otpUser.user_id } },
      update: {},
      create: { liker_id: testUser.user_id, liked_id: otpUser.user_id },
    });
    await prisma.like.upsert({
      where: { liker_id_liked_id: { liker_id: otpUser.user_id, liked_id: testUser.user_id } },
      update: {},
      create: { liker_id: otpUser.user_id, liked_id: testUser.user_id },
    });
    const [matchA1, matchB1] = orderedPair(testUser.user_id, otpUser.user_id);
    await prisma.match.upsert({
      where: { user_a_id_user_b_id: { user_a_id: matchA1, user_b_id: matchB1 } },
      update: {},
      create: { user_a_id: matchA1, user_b_id: matchB1, is_active: true },
    });

    await prisma.like.upsert({
      where: { liker_id_liked_id: { liker_id: modUser.user_id, liked_id: testUser.user_id } },
      update: {},
      create: { liker_id: modUser.user_id, liked_id: testUser.user_id },
    });
    await prisma.like.upsert({
      where: { liker_id_liked_id: { liker_id: testUser.user_id, liked_id: modUser.user_id } },
      update: {},
      create: { liker_id: testUser.user_id, liked_id: modUser.user_id },
    });
    const [matchA2, matchB2] = orderedPair(modUser.user_id, testUser.user_id);
    await prisma.match.upsert({
      where: { user_a_id_user_b_id: { user_a_id: matchA2, user_b_id: matchB2 } },
      update: {},
      create: { user_a_id: matchA2, user_b_id: matchB2, is_active: true },
    });

    await prisma.like.upsert({
      where: { liker_id_liked_id: { liker_id: adminUser.user_id, liked_id: otpUser.user_id } },
      update: {},
      create: { liker_id: adminUser.user_id, liked_id: otpUser.user_id },
    });
    if (unverifiedUser) {
      await prisma.like.upsert({
        where: { liker_id_liked_id: { liker_id: unverifiedUser.user_id, liked_id: testUser.user_id } },
        update: {},
        create: { liker_id: unverifiedUser.user_id, liked_id: testUser.user_id },
      });
    }
    if (inactiveUser) {
      await prisma.like.upsert({
        where: { liker_id_liked_id: { liker_id: testUser.user_id, liked_id: inactiveUser.user_id } },
        update: {},
        create: { liker_id: testUser.user_id, liked_id: inactiveUser.user_id },
      });
    }

    // —— VoiceCall (one completed call) ——
    await prisma.voiceCall.upsert({
      where: { call_id: 'seed-call-user-otp' },
      update: {},
      create: {
        call_id: 'seed-call-user-otp',
        caller_id: testUser.user_id,
        receiver_id: otpUser.user_id,
        status: 'ENDED',
        started_at: new Date(Date.now() - 3600000),
        ended_at: new Date(Date.now() - 3480000),
        duration: 120,
      },
    });

    // —— KYCVerification (one pending for test user) ——
    await prisma.kYCVerification.upsert({
      where: { verification_id: 'seed-kyc-testuser' },
      update: {},
      create: {
        verification_id: 'seed-kyc-testuser',
        user_id: testUser.user_id,
        method: 'DOCUMENT',
        document_type: 'ID',
        status: 'PENDING',
      },
    });

    console.log('✅ Seeded: 2 groups (4+3 members), 2 events (3 RSVPs each), 3 conversations with messages, 3–4 friendships, likes/matches (USER↔OTP, MOD↔USER, ADMIN→OTP, etc.), 1 voice call, 1 KYC');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e instanceof Error ? e.message : e);
    if (e instanceof Error && e.stack) console.error(e.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

