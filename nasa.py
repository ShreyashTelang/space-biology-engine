import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

# Load and Clean Dataset
df = pd.read_csv("NASA_Dataset.csv")

# Remove rows with any missing values
df.dropna(inplace=True)

# Convert numeric columns
for col in df.columns:
    df[col] = pd.to_numeric(df[col], errors='ignore')

# Streamlit App
st.set_page_config(page_title="Space Biology Engine", layout="wide", page_icon="🧬")

st.title("Space Biology Engine Dashboard")
st.markdown("Interactive dashboard for gene expression and space biology data analysis.")

# Sidebar Controls
st.sidebar.header("Controls")

# Columns for scatter plot
numeric_cols = df.select_dtypes(include='number').columns.tolist()
x_col = st.sidebar.selectbox("Select X-axis:", numeric_cols, index=0)
y_col = st.sidebar.selectbox("Select Y-axis:", numeric_cols, index=1)

color_col = st.sidebar.selectbox("Select Color Group (Optional):", [None] + list(df.columns))

# Heatmap selection
heatmap_cols = st.sidebar.multiselect(
    "Select columns for Heatmap (default: all numeric):",
    numeric_cols,
    default=numeric_cols
)

# Filter rows if desired
filter_col = st.sidebar.selectbox("Filter by Column (Optional):", [None] + list(df.columns))
if filter_col:
    unique_vals = df[filter_col].astype(str).unique()
    filter_val = st.sidebar.selectbox(f"Select {filter_col} value:", unique_vals)
    df_filtered = df[df[filter_col].astype(str) == filter_val].reset_index(drop=True)
else:
    df_filtered = df.copy().reset_index(drop=True)

# Dataset Preview
st.subheader("Dataset Preview")
st.dataframe(df_filtered.head())

# Download filtered dataset
csv = df_filtered.to_csv(index=False).encode('utf-8')
st.download_button(
    label="Download Filtered Dataset as CSV",
    data=csv,
    file_name='filtered_space_biology_data.csv',
    mime='text/csv',
)

# Scatter Plot
st.subheader(f"Scatter Plot: {y_col} vs {x_col}")
try:
    if color_col:
        scatter_fig = px.scatter(
            df_filtered, x=x_col, y=y_col, color=color_col,
            hover_data=df_filtered.columns, trendline="ols"
        )
    else:
        scatter_fig = px.scatter(
            df_filtered, x=x_col, y=y_col,
            hover_data=df_filtered.columns, trendline="ols"
        )
except Exception:
    # Fallback if trendline fails
    if color_col:
        scatter_fig = px.scatter(
            df_filtered, x=x_col, y=y_col, color=color_col,
            hover_data=df_filtered.columns
        )
    else:
        scatter_fig = px.scatter(
            df_filtered, x=x_col, y=y_col,
            hover_data=df_filtered.columns
        )

scatter_fig.update_layout(template='plotly_dark', title=f"{y_col} vs {x_col}")
st.plotly_chart(scatter_fig, use_container_width=True)

# Heatmap
st.subheader("Gene Expression Heatmap")
if heatmap_cols:
    heatmap_data = df_filtered[heatmap_cols]
    heatmap_fig = go.Figure(data=go.Heatmap(
        z=heatmap_data.values,
        x=heatmap_data.columns,
        y=df_filtered.index,
        colorscale='Viridis'
    ))
    heatmap_fig.update_layout(template='plotly_dark', title="Gene Expression Heatmap")
    st.plotly_chart(heatmap_fig, use_container_width=True)
else:
    st.warning("Select at least one numeric column for heatmap!")
