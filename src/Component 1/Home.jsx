
import './Home.css';
import { useProjects } from './projectsStore';

const metrics = [
  {
    label: 'Active Projects',
    value: '4',
    description: 'Currently in Progress',
    icon: '▣',
    color: 'blue',
  },
  {
    label: 'Completed Projects',
    value: '0',
    description: 'Successfully Completed',
    icon: '✓',
    color: 'green',
  },
  {
    label: 'Records Migrated',
    value: '18',
    description: 'Successfully Transferred',
    icon: '▤',
    color: 'yellow',
  },
  {
    label: 'Errors',
    value: '7%',
    description: 'Reduction in Errors',
    icon: '!',
    color: 'orange',
  },
];

export default function Home({ onNavigate }) {
  const [projects] = useProjects();

  const activeProjects = projects.filter(
    (project) => project.status === 'Active'
  ).length;

  const recentProjects = [...projects]
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 4);

  return (
    <main className="home-dashboard">
      <section className="home-hero">
        <h1>Migration Platform</h1>
        <p>
          Streamline your merger and acquisition data migrations
          with enterprise-grade tools
        </p>
      </section>

      <section className="home-metrics">
        {metrics.map((metric) => (
          <article className="home-metric-card" key={metric.label}>
            <div className="home-metric-top">
              <div>
                <p className="home-metric-label">{metric.label}</p>
                <h2>
                {metric.label === 'Active Projects'
                    ? activeProjects
                    : metric.value}
                </h2>
              </div>

              <span className={`home-metric-icon ${metric.color}`}>
                {metric.icon}
              </span>
            </div>

            <p className="home-metric-description">
              {metric.description}
            </p>
          </article>
        ))}
      </section>

      <section className="home-projects-card">
        <div className="home-projects-heading">
          <div>
            <h2>Recent Projects</h2>
            <p>Recent accessed project details</p>
          </div>

          <button
            type="button"
            className="home-view-all"
            onClick={() => onNavigate('Migration')}
          >
            View all projects →
          </button>
        </div>

        <div className="home-projects-table-wrap">
          <table className="home-projects-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>View</th>
              </tr>
            </thead>

            <tbody>
              {recentProjects.map((project) => (
                <tr key={project.name}>
                  <td className="home-project-name">{project.name}</td>
                  <td>{project.owner}</td>
                  <td>
                    <span className="home-project-status">
                      {project.status}
                    </span>
                  </td>
                  <td>{project.updated}</td>
                  <td>
                    <button
                      type="button"
                      className="home-project-view"
                      aria-label={`View ${project.name}`}
                      onClick={() => onNavigate('Migration')}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
