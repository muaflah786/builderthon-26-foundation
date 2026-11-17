import { DEFAULT_TERMS } from "@/lib/ops/types";
import type { ScenarioPack } from "@/lib/ops/scenarios/types";

/**
 * Scenario packs (data only). These are starting points: every value is copied
 * into the operation at launch and can be edited there. Example labels here are
 * NOT referenced anywhere else in the code.
 */

const general: ScenarioPack = {
  id: "general",
  name: "Something else",
  example: "Blood donation camp on Saturday at the community hall, 15 helpers, 2 rooms.",
  keywords: [],
  defaultName: "New operation",
  config: {
    terms: DEFAULT_TERMS,
    roleLabels: {
      organizer: "Organizer",
      coordinator: "Coordinator",
      lead: "Team Lead",
      member: "Member",
    },
    taskCategories: ["Setup", "Operations", "Support", "Wrap-up"],
    issueCategories: ["Safety", "Medical", "Equipment", "Supplies", "Other"],
    attention: ["urgent_issues", "delayed_tasks", "open_issues", "unclaimed_tasks"],
  },
  locations: { pattern: "Location {n}", defaultCount: 1, max: 20, fixed: ["Help desk"] },
  headcountWords: ["people", "helpers", "members", "staff", "volunteers"],
  teams: [
    {
      name: "Setup",
      purpose: "Get every place ready before the start",
      tasks: [
        { title: "Prepare the main area", category: "Setup", offsetMinutes: -60 },
        { title: "Put up signs and directions", category: "Setup", offsetMinutes: -45 },
      ],
    },
    {
      name: "Operations",
      purpose: "Run the main activity",
      perLocation: false,
      tasks: [
        { title: "Brief everyone on the plan", category: "Operations", offsetMinutes: -15 },
        { title: "Check progress every hour", category: "Operations", offsetMinutes: 60 },
      ],
    },
    {
      name: "Help desk",
      purpose: "Answer questions and handle problems",
      fixedLocation: 0,
      tasks: [
        { title: "Open the help desk", category: "Support", offsetMinutes: -15 },
        { title: "Close down and collect equipment", category: "Wrap-up", offsetMinutes: 480 },
      ],
    },
  ],
};

const festival: ScenarioPack = {
  id: "festival",
  name: "Festival or event",
  example:
    "College festival tomorrow from 9 am. 40 volunteers, 5 departments and 3 event locations.",
  keywords: [
    "festival",
    "fest",
    "event",
    "concert",
    "stage",
    "stall",
    "celebration",
    "fair",
    "cultural",
    "competition",
  ],
  defaultName: "Festival operations",
  config: {
    terms: {
      ...DEFAULT_TERMS,
      participant: "Volunteer",
      participants: "Volunteers",
      location: "Venue",
      locations: "Venues",
    },
    roleLabels: {
      organizer: "Event Organizer",
      coordinator: "Department Coordinator",
      lead: "Team Leader",
      member: "Volunteer",
    },
    taskCategories: ["Setup", "Registration", "Stage", "Hospitality", "Crowd", "Wrap-up"],
    issueCategories: ["Crowd", "Medical", "Equipment", "Lost and found", "Schedule", "Other"],
    attention: ["urgent_issues", "delayed_tasks", "unclaimed_tasks", "open_issues"],
  },
  locations: { pattern: "Venue {n}", defaultCount: 2, max: 20, fixed: ["Registration desk"] },
  headcountWords: ["volunteers", "students", "people", "members", "helpers"],
  teams: [
    {
      name: "Registration and welcome",
      purpose: "Welcome guests and register participants",
      fixedLocation: 0,
      tasks: [
        { title: "Set up the registration desk", category: "Setup", offsetMinutes: -90 },
        { title: "Print and sort participant lists", category: "Registration", offsetMinutes: -60 },
        {
          title: "Open registration",
          category: "Registration",
          priority: "high",
          offsetMinutes: -30,
        },
      ],
    },
    {
      name: "{location} crew",
      purpose: "Run the programme at {location}",
      perLocation: true,
      tasks: [
        { title: "Check sound, lights and seating", category: "Stage", offsetMinutes: -60 },
        { title: "Keep the programme on time", category: "Stage", offsetMinutes: 0 },
        { title: "Reset the venue after the last item", category: "Wrap-up", offsetMinutes: 480 },
      ],
    },
    {
      name: "Hospitality",
      purpose: "Food, water and guest care",
      tasks: [
        { title: "Set up water points", category: "Hospitality", offsetMinutes: -45 },
        {
          title: "Serve lunch to guests and volunteers",
          category: "Hospitality",
          offsetMinutes: 240,
        },
      ],
    },
    {
      name: "Crowd and safety",
      purpose: "Entry, crowd flow and first aid",
      tasks: [
        {
          title: "Post people at every entrance",
          category: "Crowd",
          priority: "high",
          offsetMinutes: -30,
        },
        { title: "Set up the first-aid point", category: "Crowd", offsetMinutes: -45 },
      ],
    },
  ],
};

const exam: ScenarioPack = {
  id: "exam",
  name: "Exam day",
  example: "University exam tomorrow at 10 am. 6 halls, 30 invigilators, 900 candidates.",
  keywords: [
    "exam",
    "examination",
    "invigilator",
    "invigilation",
    "candidates",
    "question paper",
    "answer sheet",
    "hall ticket",
    "test centre",
    "test center",
  ],
  defaultName: "Exam day operations",
  config: {
    terms: {
      participant: "Invigilator",
      participants: "Invigilators",
      team: "Hall team",
      teams: "Hall teams",
      location: "Exam hall",
      locations: "Exam halls",
      task: "Duty",
      tasks: "Duties",
      issue: "Incident",
      issues: "Incidents",
    },
    roleLabels: {
      organizer: "Exam Controller",
      coordinator: "Chief Invigilator",
      lead: "Hall Supervisor",
      member: "Invigilator",
    },
    taskCategories: ["Papers", "Seating", "Attendance", "Collection"],
    issueCategories: ["Malpractice", "Missing paper", "Medical", "Seating", "Other"],
    attention: ["urgent_issues", "delayed_tasks", "open_issues", "unclaimed_tasks"],
  },
  locations: { pattern: "Hall {n}", defaultCount: 4, max: 40, fixed: ["Exam control room"] },
  headcountWords: ["invigilators", "staff", "teachers", "supervisors"],
  teams: [
    {
      name: "Control room",
      purpose: "Keep papers secure and receive answer sheets",
      fixedLocation: 0,
      tasks: [
        {
          title: "Open sealed question papers with witness",
          category: "Papers",
          priority: "high",
          offsetMinutes: -60,
        },
        { title: "Hand paper packets to each hall", category: "Papers", offsetMinutes: -45 },
        {
          title: "Receive and count answer sheets from halls",
          category: "Collection",
          offsetMinutes: 200,
        },
      ],
    },
    {
      name: "{location}",
      purpose: "Run the exam in {location}",
      perLocation: true,
      tasks: [
        {
          title: "Collect question papers from control room",
          category: "Papers",
          priority: "high",
          offsetMinutes: -40,
        },
        { title: "Check seating and hall tickets", category: "Seating", offsetMinutes: -20 },
        {
          title: "Distribute question papers",
          category: "Papers",
          priority: "high",
          offsetMinutes: 0,
        },
        { title: "Record attendance", category: "Attendance", offsetMinutes: 15 },
        { title: "Collect and count answer sheets", category: "Collection", offsetMinutes: 180 },
      ],
    },
  ],
};

const emergency: ScenarioPack = {
  id: "emergency",
  name: "Flood or emergency response",
  example: "Flood in 3 wards since this morning. 25 responders, one relief camp at the school.",
  keywords: [
    "flood",
    "emergency",
    "rescue",
    "relief",
    "disaster",
    "evacuation",
    "evacuate",
    "cyclone",
    "landslide",
    "stranded",
  ],
  defaultName: "Emergency response",
  config: {
    terms: {
      participant: "Responder",
      participants: "Responders",
      team: "Unit",
      teams: "Units",
      location: "Zone",
      locations: "Zones",
      task: "Task",
      tasks: "Tasks",
      issue: "Incident",
      issues: "Incidents",
    },
    roleLabels: {
      organizer: "Incident Commander",
      coordinator: "Response Coordinator",
      lead: "Unit Leader",
      member: "Responder",
    },
    taskCategories: ["Rescue", "Shelter", "Medical", "Supplies", "Reporting"],
    issueCategories: ["Person trapped", "Medical emergency", "Shortage", "Road or bridge", "Other"],
    attention: ["urgent_issues", "open_issues", "unclaimed_tasks", "delayed_tasks"],
  },
  locations: {
    pattern: "Zone {n}",
    defaultCount: 3,
    max: 30,
    fixed: ["Relief camp", "Command post"],
  },
  headcountWords: ["responders", "volunteers", "rescuers", "people", "members"],
  teams: [
    {
      name: "Rescue unit, {location}",
      purpose: "Find and move people to safety in {location}",
      perLocation: true,
      tasks: [
        {
          title: "Sweep the zone for stranded people",
          category: "Rescue",
          priority: "high",
          offsetMinutes: 0,
        },
        { title: "Report water level and blocked roads", category: "Reporting", offsetMinutes: 30 },
        { title: "Guide evacuees to the relief camp", category: "Rescue", offsetMinutes: 60 },
      ],
    },
    {
      name: "Relief camp",
      purpose: "Shelter, register and feed evacuees",
      fixedLocation: 0,
      tasks: [
        {
          title: "Set up registration for arrivals",
          category: "Shelter",
          priority: "high",
          offsetMinutes: 0,
        },
        { title: "Prepare sleeping areas", category: "Shelter", offsetMinutes: 60 },
        { title: "Organize drinking water and meals", category: "Supplies", offsetMinutes: 90 },
      ],
    },
    {
      name: "Medical",
      purpose: "First aid and transfers to hospital",
      fixedLocation: 0,
      tasks: [
        {
          title: "Set up the first-aid point",
          category: "Medical",
          priority: "high",
          offsetMinutes: 0,
        },
        { title: "List people who need hospital transfer", category: "Medical", offsetMinutes: 60 },
      ],
    },
    {
      name: "Supplies",
      purpose: "Track and distribute relief material",
      fixedLocation: 1,
      tasks: [
        { title: "Count food, water and medicine stock", category: "Supplies", offsetMinutes: 30 },
        { title: "Send supplies to the relief camp", category: "Supplies", offsetMinutes: 120 },
      ],
    },
  ],
};

/** All packs. `general` must stay last: it is the fallback. */
export const SCENARIO_PACKS: readonly ScenarioPack[] = [festival, exam, emergency, general];
export const FALLBACK_PACK_ID = general.id;
