export interface ISideNavItem {
	title: string;
	markdownContent?: string;
	type: string;
	children?: ISideNavItemChild[];
}

export interface ISideNavItemChild {
	title: string;
	markdownContent: string;
}
