require('dotenv').config()

const { Client, GatewayIntentBits } = require('discord.js')
const fs   = require('fs')
const path = require('path')
const { getPosteName } = require('./config/roles.js')

const DB_PATH = path.join(__dirname, 'data/users-data.json')

// ─── DB helpers ───────────────────────────────────────────────────────────────
function loadUsers() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  } catch (e) { console.error('DB read error:', e) }
  return {}
}

function saveUsers(data) {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)) }
  catch (e) { console.error('DB write error:', e) }
}

// ─── Sync ─────────────────────────────────────────────────────────────────────
function syncMember(member) {
  const users = loadUsers()
  const nickname = member.nickname || member.user.displayName || member.user.username
  const parts    = nickname.trim().split(/\s+/)
  const prenom   = parts[0] || member.user.username
  const nom      = parts.length > 1 ? parts.slice(1).join(' ').split('-')[0].trim() : null
  const roleIds  = Array.from(member.roles.cache.keys())
  const poste    = getPosteName(roleIds)

  users[member.user.id] = {
    discordId:           member.user.id,
    username:            member.user.username,
    nom:                 nom || member.user.username,
    prenom,
    poste,
    name:                nom ? `${prenom} ${nom}` : nickname,
    roles:               roleIds,
    avatar:              member.user.displayAvatarURL({ extension: 'png', dynamic: true }),
    dateEnregistrement:  users[member.user.id]?.dateEnregistrement || new Date().toISOString(),
    dateMiseAJour:       new Date().toISOString(),
  }
  saveUsers(users)
}

// ─── Bot ──────────────────────────────────────────────────────────────────────
if (!process.env.DISCORD_BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN manquant — bot non démarré')
  process.exit(1)
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

client.once('ready', async () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`)
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID || '1435626232749232181')
  if (!guild) return console.warn('⚠️  Serveur Discord non trouvé')

  console.log(`🏥 Serveur : ${guild.name} (${guild.memberCount} membres)`)
  console.log('🔄 Synchronisation initiale...')

  const members = await guild.members.fetch()
  let count = 0
  for (const member of members.values()) {
    if (!member.user.bot) { syncMember(member); count++ }
  }
  console.log(`✅ ${count} membres synchronisés`)
})

client.on('guildMemberAdd',    member => syncMember(member))
client.on('guildMemberUpdate', (_, newMember) => syncMember(newMember))

client.on('messageCreate', async msg => {
  if (msg.author.bot) return

  if (msg.content === '!sync') {
    syncMember(msg.member)
    msg.reply('✅ Informations synchronisées !')
  }

  if (msg.content === '!info') {
    const users = loadUsers()
    const u = users[msg.author.id]
    if (u) {
      msg.reply(`📋 **${u.name}** — ${u.poste}`)
    } else {
      msg.reply('❌ Aucune info. Tape `!sync` ou connecte-toi au portail.')
    }
  }

  if (msg.content === '!help') {
    msg.reply({
      embeds: [{
        title: '🤖 Bot HCT',
        color: 0x5865F2,
        fields: [
          { name: '!sync', value: 'Synchroniser vos infos Discord', inline: false },
          { name: '!info', value: 'Afficher vos informations', inline: false },
        ]
      }]
    })
  }
})

client.on('error', err => console.error('❌ Erreur Discord:', err))
process.on('unhandledRejection', err => console.error('❌ Unhandled:', err))

client.login(process.env.DISCORD_BOT_TOKEN)
