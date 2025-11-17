interface SimpleBarChartDataPoint {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  title: string;
  description?: string;
  data: SimpleBarChartDataPoint[];
  emptyMessage: string;
  isLoading?: boolean;
  variant?: 'primary' | 'info';
}

const getVariantClass = (variant: SimpleBarChartProps['variant']) => {
  if (variant === 'info') {
    return 'simple-bar-chart--info';
  }

  return 'simple-bar-chart--primary';
};

export const SimpleBarChart = ({
  title,
  description,
  data,
  emptyMessage,
  isLoading = false,
  variant = 'primary',
}: SimpleBarChartProps) => {
  const maxValue = data.reduce((max, item) => Math.max(max, item.value), 0);
  const variantClass = getVariantClass(variant);

  return (
    <section className={`card simple-bar-chart ${variantClass}`}>
      <div className="simple-bar-chart__header">
        <div>
          <span className="badge">Visão geral</span>
          <h3>{title}</h3>
        </div>
        {description && <p className="section-subtitle">{description}</p>}
      </div>

      {isLoading ? (
        <p className="section-subtitle">Carregando dados...</p>
      ) : data.length === 0 ? (
        <p className="section-subtitle">{emptyMessage}</p>
      ) : (
        <ul className="simple-bar-chart__list">
          {data.map((item) => {
            const widthPercentage = maxValue === 0 ? 0 : Math.round((item.value / maxValue) * 100);

            return (
              <li key={item.label} className="simple-bar-chart__item">
                <div className="simple-bar-chart__label">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <div className="simple-bar-chart__bar" role="presentation" aria-hidden>
                  <span
                    className="simple-bar-chart__bar-fill"
                    style={{ width: `${widthPercentage}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
