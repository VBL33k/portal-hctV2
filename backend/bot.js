require('dotenv').config()

const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js')
const fs   = require('fs')
const path = require('path')
const { getPosteName } = require('./config/roles.js')

const DB_PATH     = path.join(__dirname, 'data/users-data.json')
const BIPPER_FILE = path.join(__dirname, 'data/bipper-requests.json')

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

// ─── Bipper helpers ───────────────────────────────────────────────────────────
function loadRequests() {
  try {
    if (fs.existsSync(BIPPER_FILE)) return JSON.parse(fs.readFileSync(BIPPER_FILE, 'utf8'))
  } catch { }
  return []
}

function saveRequests(data) {
  try { fs.writeFileSync(BIPPER_FILE, JSON.stringify(data, null, 2)) }
  catch (e) { console.error('Bipper write error:', e) }
}

const URGENCY_COLORS = {
  'Faible':   0x22c55e,
  'Modérée':  0xf59e0b,
  'Élevée':   0xf97316,
  'Critique': 0xef4444,
}
const URGENCY_EMOJI = {
  'Faible':   '🟢',
  'Modérée':  '🟡',
  'Élevée':   '🟠',
  'Critique': '🔴',
}

function buildBipperEmbed(req) {
  const color   = URGENCY_COLORS[req.urgency] || 0x5865F2
  const emoji   = URGENCY_EMOJI[req.urgency]  || '⚠️'
  const statusMap = {
    pending:   '⏳ En attente',
    accepted:  '✅ Acceptée',
    completed: '✔️ Terminée',
  }

  const embed = new EmbedBuilder()
    .setTitle(`🚨 DEMANDE DE RENFORT — ${req.unitLabel}`)
    .setColor(req.status === 'completed' ? 0x22c55e : color)
    .setDescription(
      req.status === 'completed'
        ? '✔️ Cette demande de renfort a été marquée comme **terminée**.'
        : 'Une demande de renfort a été émise depuis le portail HCT.'
    )
    .addFields(
      { name: '🏥 Hôpital',              value: req.hospitalLabel,    inline: true  },
      { name: '📍 Localisation',         value: req.location,         inline: true  },
      { name: "🏷️ Type d'intervention",  value: req.interventionType, inline: false },
      { name: `${emoji} Niveau d'urgence`, value: req.urgency,        inline: true  },
      { name: '📊 Statut',               value: statusMap[req.status] || req.status, inline: true },
      { name: '👤 Demandé par',          value: req.requestedByName,  inline: true  },
    )
    .setFooter({ text: req.status === 'completed' ? 'HCT Healthcare Portal' : 'HCT Healthcare Portal · Réagissez ✅ pour accepter' })
    .setTimestamp(new Date(req.createdAt))

  if (req.info) {
    embed.addFields({ name: '💬 Infos complémentaires', value: req.info, inline: false })
  }
  if (req.acceptedByName) {
    embed.addFields({ name: '✅ Accepté par', value: req.acceptedByName, inline: true })
  }
  if (req.completedByName) {
    embed.addFields({ name: '✔️ Terminé par', value: req.completedByName, inline: true })
  }

  return embed
}

// ─── Sync ─────────────────────────────────────────────────────────────────────
function syncMember(member) {
  const users    = loadUsers()
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
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
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

  startBipperPolling()
})

// ─── Bipper polling ───────────────────────────────────────────────────────────
function startBipperPolling() {
  console.log('📡 Bipper polling démarré (3s)')

  setInterval(async () => {
    try {
      const requests = loadRequests()
      let changed = false

      for (const req of requests) {
        // 1. Envoyer les nouveaux embeds
        if (!req.discordSent) {
          try {
            const channel = await client.channels.fetch(req.channelId)
            if (!channel) continue

            const msg = await channel.send({
              content: `<@&${req.unitRoleId}> — Demande de renfort`,
              embeds:  [buildBipperEmbed(req)],
            })

            await msg.react('✅')

            req.discordSent      = true
            req.discordMessageId = msg.id
            req.updatedAt        = new Date().toISOString()
            changed = true

            console.log(`📨 Bipper envoyé [${req.id}] — ${req.unitLabel} @ ${req.hospitalLabel}`)
          } catch (err) {
            console.error(`❌ Bipper send error [${req.id}]:`, err.message)
          }
          continue
        }

        // 2. Mettre à jour l'embed quand la demande est terminée
        if (req.status === 'completed' && !req.discordCompletionSent && req.discordMessageId) {
          try {
            const channel = await client.channels.fetch(req.channelId)
            if (!channel) continue
            const msg = await channel.messages.fetch(req.discordMessageId)
            await msg.edit({ embeds: [buildBipperEmbed(req)] })
            req.discordCompletionSent = true
            req.updatedAt = new Date().toISOString()
            changed = true
            console.log(`✔️ Bipper terminé [${req.id}] — embed mis à jour`)
          } catch (err) {
            console.error(`❌ Bipper completion update error [${req.id}]:`, err.message)
          }
        }

        // 3. Supprimer le message Discord si demande supprimée depuis le portail
        if (req.discordDeletePending && req.discordMessageId) {
          try {
            const channel = await client.channels.fetch(req.channelId)
            if (channel) {
              const msg = await channel.messages.fetch(req.discordMessageId).catch(() => null)
              if (msg) await msg.delete()
            }
            // Retirer de la liste une fois supprimé
            const idx = requests.indexOf(req)
            if (idx !== -1) requests.splice(idx, 1)
            changed = true
            console.log(`🗑️ Bipper supprimé [${req.id}] — message Discord effacé`)
          } catch (err) {
            console.error(`❌ Bipper delete error [${req.id}]:`, err.message)
          }
        }
      }

      if (changed) saveRequests(requests)
    } catch (err) {
      console.error('❌ Bipper polling error:', err.message)
    }
  }, 3000)
}

// ─── Reaction handler (✅ = accepter la demande) ───────────────────────────────
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return
  if (reaction.emoji.name !== '✅') return

  if (reaction.partial) {
    try { await reaction.fetch() } catch { return }
  }

  const messageId = reaction.message.id
  const requests  = loadRequests()
  const idx       = requests.findIndex(r => r.discordMessageId === messageId)
  if (idx === -1) return

  const req = requests[idx]
  if (req.status !== 'pending') return

  let accepterName = user.username
  try {
    const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID || '1435626232749232181')
    if (guild) {
      const member = await guild.members.fetch(user.id)
      accepterName = member.nickname || member.user.displayName || user.username
    }
  } catch {}

  requests[idx].status          = 'accepted'
  requests[idx].acceptedBy      = user.id
  requests[idx].acceptedByName  = accepterName
  requests[idx].acceptedAt      = new Date().toISOString()
  requests[idx].updatedAt       = new Date().toISOString()
  saveRequests(requests)

  // Mettre à jour l'embed Discord
  try {
    const channel = reaction.message.channel
    const msg     = await channel.messages.fetch(messageId)
    await msg.edit({ embeds: [buildBipperEmbed(requests[idx])] })
    console.log(`✅ Bipper accepté [${req.id}] par ${accepterName}`)
  } catch (err) {
    console.error('❌ Embed update error:', err.message)
  }
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
          { name: '!info', value: 'Afficher vos informations',      inline: false },
        ]
      }]
    })
  }
})

client.on('error', err => console.error('❌ Erreur Discord:', err))
process.on('unhandledRejection', err => console.error('❌ Unhandled:', err))

client.login(process.env.DISCORD_BOT_TOKEN)
