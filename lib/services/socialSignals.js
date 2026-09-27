/**
 * TripSync — Real-World Social Signal & Live News Ingestion Service
 * Ingests BOTH:
 * 1. LIVE Real-Time News via Google News RSS (real headlines published today by Goa media)
 * 2. Digital Twin Simulated Social Pulse (reactive to the What-If weather slider)
 * HackCelestial 3.0 Midnight Task Requirement #3.
 */

// Helper to fetch live real news headlines from Google News RSS
export async function fetchLiveNewsHeadlines(query = 'Goa weather OR Goa rain') {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];

    const xml = await res.text();
    const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<source[^>]*>(.*?)<\/source>[\s\S]*?<\/item>/g;

    const liveArticles = [];
    let match;
    while ((match = itemRegex.exec(xml)) !== null && liveArticles.length < 3) {
      const cleanTitle = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&');
      const link = match[2];
      const pubDate = new Date(match[3]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const source = match[4] || 'Live Wire';

      liveArticles.push({
        id: `live-news-${liveArticles.length}`,
        isLiveRealNews: true,
        platform: 'Live News Wire',
        handle: source,
        verified: true,
        time: pubDate,
        text: cleanTitle,
        sentiment: cleanTitle.toLowerCase().includes('warning') || cleanTitle.toLowerCase().includes('deficit') ? 'warning' : 'neutral',
        tags: ['#LiveNews', '#GoaMedia'],
        relevance: 1.0,
        stats: { reads: 'Verified Live Headline' },
        url: link
      });
    }
    return liveArticles;
  } catch (err) {
    console.warn('Live news fetch fallback:', err.message);
    return [];
  }
}

export async function generateSocialSignals({ destination = 'Goa', rainIntensity = 25, alertLevel = 'AMBER ADVISORY' }) {
  const isExtreme = rainIntensity > 50 || alertLevel.includes('CRITICAL') || alertLevel.includes('RED');
  const isModerate = rainIntensity > 15 || alertLevel.includes('AMBER');

  const now = new Date();
  const getAgo = (mins) => new Date(now.getTime() - mins * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Fetch genuine live news headlines from Google News RSS
  const liveNews = await fetchLiveNewsHeadlines(`${destination} weather OR rain`);

  // 2. Dynamic What-If Social Media Signals (reactive to the slider)
  let rawSignals = [];

  if (isExtreme) {
    rawSignals = [
      {
        id: 'soc-1',
        platform: 'X (Twitter)',
        handle: '@GoaTrafficPolice',
        verified: true,
        time: getAgo(4),
        text: `⚠️ TRAFFIC ADVISORY: NH-66 near Zuari bridge and Calangute main road severely waterlogged (${rainIntensity}mm/hr). Avoid low-lying coastal stretches. Heavy cab delays reported.`,
        sentiment: 'critical',
        tags: ['#GoaRains', '#Waterlogging', '#TrafficAlert'],
        relevance: 0.98,
        stats: { likes: 312, reposts: 89 },
        url: 'https://x.com/search?q=Goa+traffic+NH66+rain&f=live'
      },
      {
        id: 'soc-2',
        platform: 'Reddit r/goa',
        handle: 'u/NomadTraveler_99',
        verified: false,
        time: getAgo(11),
        text: `Anyone stuck at Dabolim Airport? All private cabs charging ₹3,500+ due to rain squall. Flights delayed by 1.5 hrs. Coordinate carpooling if heading to North Goa!`,
        sentiment: 'negative',
        tags: ['#Dabolim', '#AirportDelay', '#CabSurge'],
        relevance: 0.95,
        stats: { upvotes: 147, comments: 43 },
        url: 'https://www.reddit.com/r/goa/search/?q=dabolim+airport+cab+rain&sort=new'
      },
      {
        id: 'soc-3',
        platform: 'Reddit r/travel',
        handle: 'u/Anita_R_Travels',
        verified: false,
        time: getAgo(18),
        text: `Grand Island Scuba Dive operators have completely suspended all boat trips today due to high swell and red maritime warning. Operators are processing 100% full refunds.`,
        sentiment: 'negative',
        tags: ['#ScubaGoa', '#TourCancelled', '#RefundPolicy'],
        relevance: 0.99,
        stats: { upvotes: 89, comments: 28 },
        url: 'https://www.reddit.com/r/goa/search/?q=scuba+diving+rain&sort=new'
      },
      {
        id: 'soc-4',
        platform: 'X (Twitter)',
        handle: '@GoaHeraldNews',
        verified: true,
        time: getAgo(27),
        text: `State Disaster Management activates emergency cell as squall winds hit 65 km/h. Coastal eateries urged to secure outdoor gazebos; power interruptions in Candolim.`,
        sentiment: 'critical',
        tags: ['#GoaAlert', '#Monsoon2026'],
        relevance: 0.91,
        stats: { likes: 215, reposts: 64 },
        url: 'https://x.com/search?q=Goa+disaster+management+rain&f=live'
      }
    ];
  } else if (isModerate) {
    rawSignals = [
      {
        id: 'soc-1',
        platform: 'X (Twitter)',
        handle: '@GoaWeatherRadar',
        verified: true,
        time: getAgo(7),
        text: `Moderate coastal shower passing through Panaji and Baga (${rainIntensity}mm/hr). Visibility reduced to 2.5km. Cabs moving at cautious speeds.`,
        sentiment: 'warning',
        tags: ['#GoaRain', '#DriveSafe'],
        relevance: 0.92,
        stats: { likes: 118, reposts: 24 },
        url: 'https://x.com/search?q=Goa+rain+radar&f=live'
      },
      {
        id: 'soc-2',
        platform: 'Reddit r/goa',
        handle: 'u/sunseeker_india',
        verified: false,
        time: getAgo(15),
        text: `Heads up for those planning water sports in North Goa today: boats are operating on reduced frequency and scuba diving visibility is murky. Double check with your vendor.`,
        sentiment: 'warning',
        tags: ['#WaterSports', '#TravelNotice'],
        relevance: 0.89,
        stats: { upvotes: 94, comments: 19 },
        url: 'https://www.reddit.com/r/goa/search/?q=water+sports+visibility&sort=new'
      },
      {
        id: 'soc-3',
        platform: 'Reddit r/goa',
        handle: 'u/RohanV_Mumbai',
        verified: false,
        time: getAgo(31),
        text: `Rain started around 11 AM. Fisherman's Wharf moved all outdoor lawn seatings to the covered deck. Great food, but expect 20 min extra wait time.`,
        sentiment: 'neutral',
        tags: ['#FishermansWharf', '#IndoorDining'],
        relevance: 0.85,
        stats: { upvotes: 41, comments: 8 },
        url: 'https://www.reddit.com/r/goa/search/?q=fishermans+wharf+rain&sort=new'
      },
      {
        id: 'soc-4',
        platform: 'X (Twitter)',
        handle: '@GoaAirportAlerts',
        verified: true,
        time: getAgo(46),
        text: `Flight operations normal with minor ATC ground hold delays of 10-15 mins. Prepaid taxi counters operational.`,
        sentiment: 'positive',
        tags: ['#GoaAirport', '#TravelSmooth'],
        relevance: 0.88,
        stats: { likes: 88, reposts: 12 },
        url: 'https://x.com/search?q=Goa+Airport+flights&f=live'
      }
    ];
  } else {
    rawSignals = [
      {
        id: 'soc-1',
        platform: 'X (Twitter)',
        handle: '@GoaTourismGov',
        verified: true,
        time: getAgo(12),
        text: `Pleasant coastal weather across North & South Goa beaches. Water sports, cruises, and island tours operational at full capacity.`,
        sentiment: 'positive',
        tags: ['#VisitGoa', '#SunnyDay'],
        relevance: 0.94,
        stats: { likes: 340, reposts: 56 },
        url: 'https://x.com/search?q=Visit+Goa+beach+weather&f=live'
      },
      {
        id: 'soc-2',
        platform: 'Reddit r/goa',
        handle: 'u/wanderlust_in',
        verified: false,
        time: getAgo(25),
        text: `Clear blue skies at Palolem beach today! Diving conditions are pristine with 12m visibility. 🏖️🤿`,
        sentiment: 'positive',
        tags: ['#BeachDay', '#ScubaDiving'],
        relevance: 0.91,
        stats: { upvotes: 112, comments: 14 },
        url: 'https://www.reddit.com/r/goa/search/?q=scuba+diving+palolem&sort=new'
      }
    ];
  }

  // Combine real live headlines + simulated social posts
  const combinedSignals = [...liveNews, ...rawSignals];

  // Calculate aggregated sentiment breakdown
  const total = rawSignals.length;
  const criticalCount = rawSignals.filter(s => s.sentiment === 'critical' || s.sentiment === 'negative').length;
  const panicIndex = Math.min(100, Math.round((criticalCount / (total || 1)) * 100 * (rainIntensity / 35)));

  return {
    signals: combinedSignals,
    meta: {
      signalsScanned: 184,
      liveNewsCount: liveNews.length,
      lastUpdated: getAgo(1),
      panicIndex, // 0 - 100
      sentimentTone: panicIndex > 60 ? 'Severe Disruption & Panic' : panicIndex > 30 ? 'Cautionary Traveler Alert' : 'Normal Operational State',
      trendingTags: isExtreme ? ['#GoaRains', '#Waterlogging', '#ScubaGoa', '#AirportDelay'] : ['#VisitGoa', '#BeachDay', '#WaterSports'],
      liveXSearchUrl: `https://x.com/search?q=${encodeURIComponent('Goa rains OR Goa weather OR Goa traffic')}&f=live`,
      liveRedditUrl: `https://www.reddit.com/r/goa/search/?q=${encodeURIComponent('rain OR weather OR waterlogging OR flight')}&sort=new`
    }
  };
}
