export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { name, email, phone, service, date, time, notes } = req.body;

        if (!name || !email || !phone || !service || !date || !time) {
            return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
        }

        const startDateTime = new Date(`${date}T${time}:00`);
        const serviceDuration = getServiceDuration(service);
        const endDateTime = new Date(startDateTime.getTime() + serviceDuration * 60000);

        const eventData = {
            summary: `NILTON BARBER - ${service}`,
            description: `Cliente: ${name}\nTelefone: ${phone}\nEmail: ${email}\nServiço: ${service}\n\nObservações: ${notes || 'Nenhuma'}`,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'Europe/Lisbon'
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'Europe/Lisbon'
            },
            attendees: [
                { email: email }
            ],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 60 }
                ]
            }
        };

        const gcalToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;
        
        if (gcalToken) {
            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${gcalToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Google Calendar API Error:', errorData);
                throw new Error('Erro ao criar evento no Google Calendar');
            }

            const calendarEvent = await response.json();
            
            return res.status(200).json({
                success: true,
                message: 'Agendamento realizado com sucesso!',
                eventId: calendarEvent.id,
                eventLink: calendarEvent.htmlLink
            });
        } else {
            console.log('Agendamento simulado (Google Calendar não configurado):', eventData);
            
            return res.status(200).json({
                success: true,
                message: 'Agendamento realizado com sucesso!',
                note: 'Configure GOOGLE_CALENDAR_ACCESS_TOKEN nas variáveis de ambiente da Vercel para ativar a integração com Google Calendar'
            });
        }

    } catch (error) {
        console.error('Erro ao processar agendamento:', error);
        return res.status(500).json({
            message: 'Erro ao processar agendamento',
            error: error.message
        });
    }
}

function getServiceDuration(service) {
    const durations = {
        'Corte Clássico': 50,
        'Design de Barba': 40,
        'Corte + Barba Completo': 90
    };
    return durations[service] || 60;
}
